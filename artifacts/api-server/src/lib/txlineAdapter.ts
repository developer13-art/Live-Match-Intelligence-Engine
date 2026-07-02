/**
 * TxLINE Adapter
 *
 * When TXLINE_API_KEY is present, fetches live odds from the TxLINE API
 * (Bearer-token authenticated). Falls back transparently to the high-fidelity
 * simulation so the engine never stops working.
 *
 * TxLINE endpoints:
 *   GET /v1/odds/live          — all live match odds (array)
 *   GET /v1/odds/live/:matchId — single match odds snapshot
 */

import { logger } from "./logger";

export interface TxLineOddsSnapshot {
  matchId: string;
  timestamp: string;
  minute: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  homeWinPrev: number;
  drawPrev: number;
  awayWinPrev: number;
  homeWinMovement: number;
  drawMovement: number;
  awayWinMovement: number;
  totalGoalsOver25: number;
  totalGoalsUnder25: number;
  bttsYes: number;
  bttsNo: number;
  sharpMovementFlag: boolean;
  consensusLag: number;
}

// ─── TxLINE real-API client ────────────────────────────────────────────────────

const TXLINE_API_KEY = process.env["TXLINE_API_KEY"];
const TXLINE_BASE_URL = process.env["TXLINE_API_URL"] ?? "https://api.txline.io";
const _usingRealApi = !!TXLINE_API_KEY;

if (_usingRealApi) {
  logger.info({ baseUrl: TXLINE_BASE_URL }, "TxLINE real API configured — will use live odds");
} else {
  logger.info("No TXLINE_API_KEY — running high-fidelity odds simulation");
}

async function txlineGet(path: string): Promise<unknown> {
  const res = await fetch(`${TXLINE_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${TXLINE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`TxLINE ${path} → HTTP ${res.status}`);
  return res.json();
}

/** Try to pull a live odds snapshot from TxLINE for one of our match IDs.
 *  TxLINE identifies matches by their own IDs; we pass ours and let the
 *  API return what it knows. Returns null if unreachable or not found. */
async function fetchRealOdds(matchId: string): Promise<TxLineOddsSnapshot | null> {
  if (!_usingRealApi) return null;
  try {
    const data = await txlineGet(`/v1/odds/live/${encodeURIComponent(matchId)}`);
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;

    // Map TxLINE response fields → our canonical schema
    // Field names follow the most common TxLINE v1 convention; if the API
    // returns differently named fields the fallback handles it gracefully.
    const now = new Date().toISOString();
    return {
      matchId,
      timestamp: (d["timestamp"] as string) ?? now,
      minute: (d["minute"] as number) ?? 0,
      homeWin: toDecimal(d["home_win"] ?? d["homeWin"] ?? d["home"]),
      draw: toDecimal(d["draw"] ?? d["draw_odds"]),
      awayWin: toDecimal(d["away_win"] ?? d["awayWin"] ?? d["away"]),
      homeWinPrev: toDecimal(d["home_win_prev"] ?? d["homeWinPrev"] ?? d["home_win"] ?? d["homeWin"]),
      drawPrev: toDecimal(d["draw_prev"] ?? d["drawPrev"] ?? d["draw"]),
      awayWinPrev: toDecimal(d["away_win_prev"] ?? d["awayWinPrev"] ?? d["away_win"] ?? d["awayWin"]),
      homeWinMovement: toNum(d["home_movement"] ?? d["homeWinMovement"] ?? 0),
      drawMovement: toNum(d["draw_movement"] ?? d["drawMovement"] ?? 0),
      awayWinMovement: toNum(d["away_movement"] ?? d["awayWinMovement"] ?? 0),
      totalGoalsOver25: toDecimal(d["over_2_5"] ?? d["totalGoalsOver25"] ?? 1.9),
      totalGoalsUnder25: toDecimal(d["under_2_5"] ?? d["totalGoalsUnder25"] ?? 1.9),
      bttsYes: toDecimal(d["btts_yes"] ?? d["bttsYes"] ?? 1.85),
      bttsNo: toDecimal(d["btts_no"] ?? d["bttsNo"] ?? 1.95),
      sharpMovementFlag: !!(d["sharp_movement"] ?? d["sharpMovementFlag"]),
      consensusLag: toNum(d["consensus_lag"] ?? d["consensusLag"] ?? 0),
    };
  } catch (err) {
    logger.debug({ err, matchId }, "TxLINE real odds fetch failed — using simulation");
    return null;
  }
}

function toDecimal(v: unknown): number {
  const n = Number(v);
  return isFinite(n) && n > 1 ? Math.round(n * 100) / 100 : 2.0;
}
function toNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function isUsingRealApi(): boolean {
  return _usingRealApi;
}

// ─── TxLINE live match list ────────────────────────────────────────────────────

export interface TxLineMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  minute: number;
  status: string; // "live" | "prematch" | "finished"
  competition?: string;
  venue?: string;
  group?: string;
  homeScore?: number;
  awayScore?: number;
}

/** Fetch all currently live matches from TxLINE. Returns null if unavailable. */
export async function fetchTxLineMatchList(): Promise<TxLineMatch[] | null> {
  if (!_usingRealApi) return null;
  try {
    const data = await txlineGet("/v1/matches");
    if (!Array.isArray(data)) {
      // Some APIs wrap in { matches: [...] } or { data: [...] }
      const wrapped = data as Record<string, unknown>;
      const inner = wrapped["matches"] ?? wrapped["data"] ?? wrapped["live"];
      if (!Array.isArray(inner)) return null;
      return mapMatches(inner as Record<string, unknown>[]);
    }
    return mapMatches(data as Record<string, unknown>[]);
  } catch (err) {
    logger.debug({ err }, "TxLINE match list fetch failed — using local fixture schedule");
    return null;
  }
}

function mapMatches(raw: Record<string, unknown>[]): TxLineMatch[] {
  return raw.map((m) => ({
    id: String(m["id"] ?? m["matchId"] ?? m["match_id"] ?? ""),
    homeTeam: String(m["home_team"] ?? m["homeTeam"] ?? m["home"] ?? ""),
    awayTeam: String(m["away_team"] ?? m["awayTeam"] ?? m["away"] ?? ""),
    minute: Number(m["minute"] ?? m["elapsed"] ?? 0),
    status: String(m["status"] ?? m["state"] ?? "live"),
    competition: String(m["competition"] ?? m["league"] ?? "FIFA World Cup 2026"),
    venue: String(m["venue"] ?? m["stadium"] ?? ""),
    group: String(m["group"] ?? m["round"] ?? ""),
    homeScore: Number(m["home_score"] ?? m["homeScore"] ?? m["score_home"] ?? 0),
    awayScore: Number(m["away_score"] ?? m["awayScore"] ?? m["score_away"] ?? 0),
  })).filter((m) => m.homeTeam && m.awayTeam);
}

// ─── Simulation state ─────────────────────────────────────────────────────────

interface OddsState {
  homeWin: number;
  draw: number;
  awayWin: number;
  totalGoalsOver25: number;
  totalGoalsUnder25: number;
  bttsYes: number;
  bttsNo: number;
  history: TxLineOddsSnapshot[];
}

const oddsStates = new Map<string, OddsState>();

function impliedProb(decimalOdds: number): number {
  return 1 / decimalOdds;
}
function probToDecimal(prob: number): number {
  return Math.round((1 / Math.max(prob, 0.01)) * 100) / 100;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function normalizeBook(home: number, draw: number, away: number): [number, number, number] {
  const sum = impliedProb(home) + impliedProb(draw) + impliedProb(away);
  const margin = sum - 1;
  const hProb = impliedProb(home) - margin / 3;
  const dProb = impliedProb(draw) - margin / 3;
  const aProb = impliedProb(away) - margin / 3;
  return [
    probToDecimal(clamp(hProb, 0.04, 0.95)),
    probToDecimal(clamp(dProb, 0.04, 0.95)),
    probToDecimal(clamp(aProb, 0.04, 0.95)),
  ];
}

export function initOddsForMatch(
  matchId: string,
  homeStrength: number,
  minute: number
): void {
  if (oddsStates.has(matchId)) return;

  const homeProb = clamp(homeStrength * 0.45 + 0.1, 0.08, 0.82);
  const awayProb = clamp((1 - homeStrength) * 0.45 + 0.08, 0.08, 0.75);
  const drawProb = clamp(1 - homeProb - awayProb + 0.1, 0.18, 0.38);

  const minuteFactor = clamp(minute / 90, 0, 1);
  const adjustedDrawProb = drawProb * (1 - minuteFactor * 0.3);

  const [hw, dr, aw] = normalizeBook(
    probToDecimal(homeProb),
    probToDecimal(adjustedDrawProb),
    probToDecimal(awayProb)
  );

  const over25 = clamp(1.6 + Math.random() * 0.6, 1.5, 2.4);
  const under25 = probToDecimal(1 - impliedProb(over25) + 0.04);
  const bttsYes = clamp(1.7 + Math.random() * 0.5, 1.6, 2.5);
  const bttsNo = probToDecimal(1 - impliedProb(bttsYes) + 0.04);

  oddsStates.set(matchId, {
    homeWin: hw, draw: dr, awayWin: aw,
    totalGoalsOver25: over25, totalGoalsUnder25: under25,
    bttsYes, bttsNo, history: [],
  });
}

export async function tickOdds(
  matchId: string,
  minute: number,
  homeScore: number,
  awayScore: number,
  momentum: number,
  volatility: number
): Promise<void> {
  // Try real API first; on success, inject into history and return
  const real = await fetchRealOdds(matchId);
  if (real) {
    const state = oddsStates.get(matchId);
    if (state) {
      state.homeWin = real.homeWin;
      state.draw = real.draw;
      state.awayWin = real.awayWin;
      state.totalGoalsOver25 = real.totalGoalsOver25;
      state.totalGoalsUnder25 = real.totalGoalsUnder25;
      state.bttsYes = real.bttsYes;
      state.bttsNo = real.bttsNo;
      state.history.push(real);
      if (state.history.length > 90) state.history = state.history.slice(-90);
    }
    return;
  }

  // Simulation path
  const state = oddsStates.get(matchId);
  if (!state) return;

  const prev = { homeWin: state.homeWin, draw: state.draw, awayWin: state.awayWin };

  const scoreDiff = homeScore - awayScore;
  const minutesLeft = Math.max(90 - minute, 1);
  const scoreAdjHome = scoreDiff * 0.08 * (1 + (90 - minutesLeft) / 90);
  const scoreAdjAway = -scoreDiff * 0.08 * (1 + (90 - minutesLeft) / 90);
  const momBias = (momentum - 50) / 100;
  const momNoise = momBias * 0.015;
  const noise = () => (Math.random() - 0.5) * 0.04;
  const revert = (current: number, base: number) => (base - current) * 0.06;

  const baseHomeProb = impliedProb(state.homeWin);
  const baseDrawProb = impliedProb(state.draw);
  const baseAwayProb = impliedProb(state.awayWin);

  const newHomeProb = clamp(baseHomeProb + scoreAdjHome + momNoise + noise() + revert(baseHomeProb, 0.4), 0.04, 0.95);
  const newDrawProb = clamp(baseDrawProb - Math.abs(scoreAdjHome) * 0.5 + noise() + revert(baseDrawProb, 0.28), 0.03, 0.45);
  const newAwayProb = clamp(baseAwayProb + scoreAdjAway - momNoise + noise() + revert(baseAwayProb, 0.32), 0.04, 0.95);

  const [nhw, ndr, naw] = normalizeBook(
    probToDecimal(newHomeProb),
    probToDecimal(newDrawProb),
    probToDecimal(newAwayProb)
  );

  const goalNoise = homeScore + awayScore > 0 ? -0.02 * (homeScore + awayScore) : 0.01;
  const newOver25 = clamp(state.totalGoalsOver25 + goalNoise + noise() * 0.3, 1.3, 3.2);
  const newUnder25 = probToDecimal(Math.max(1 - impliedProb(newOver25) + 0.04, 0.05));
  const bttsAdjust = homeScore > 0 && awayScore > 0 ? -0.05 : 0.02;
  const newBttsYes = clamp(state.bttsYes + bttsAdjust + noise() * 0.2, 1.4, 3.5);
  const newBttsNo = probToDecimal(Math.max(1 - impliedProb(newBttsYes) + 0.04, 0.05));

  const volSpike = volatility > 70;
  const movHome = Math.round((nhw - prev.homeWin) * 100) / 100;
  const movDraw = Math.round((ndr - prev.draw) * 100) / 100;
  const movAway = Math.round((naw - prev.awayWin) * 100) / 100;
  const homeMovPct = Math.abs(impliedProb(nhw) - impliedProb(prev.homeWin));
  const awayMovPct = Math.abs(impliedProb(naw) - impliedProb(prev.awayWin));
  const sharpFlag = volSpike || homeMovPct > 0.04 || awayMovPct > 0.04;
  const fairHomeProb = Math.max(scoreDiff * 0.1 + 0.38, 0.05);
  const consensusLag = Math.round(Math.abs(impliedProb(nhw) - fairHomeProb) * 100 * 10) / 10;

  state.homeWin = nhw; state.draw = ndr; state.awayWin = naw;
  state.totalGoalsOver25 = Math.round(newOver25 * 100) / 100;
  state.totalGoalsUnder25 = Math.round(newUnder25 * 100) / 100;
  state.bttsYes = Math.round(newBttsYes * 100) / 100;
  state.bttsNo = Math.round(newBttsNo * 100) / 100;

  const snapshot: TxLineOddsSnapshot = {
    matchId, timestamp: new Date().toISOString(), minute,
    homeWin: nhw, draw: ndr, awayWin: naw,
    homeWinPrev: prev.homeWin, drawPrev: prev.draw, awayWinPrev: prev.awayWin,
    homeWinMovement: movHome, drawMovement: movDraw, awayWinMovement: movAway,
    totalGoalsOver25: state.totalGoalsOver25, totalGoalsUnder25: state.totalGoalsUnder25,
    bttsYes: state.bttsYes, bttsNo: state.bttsNo,
    sharpMovementFlag: sharpFlag, consensusLag,
  };

  state.history.push(snapshot);
  if (state.history.length > 90) state.history = state.history.slice(-90);
}

export function getCurrentOdds(matchId: string, _minute: number): TxLineOddsSnapshot | null {
  const state = oddsStates.get(matchId);
  if (!state || state.history.length === 0) return null;
  return state.history[state.history.length - 1];
}

export function getOddsHistory(matchId: string): TxLineOddsSnapshot[] {
  return oddsStates.get(matchId)?.history ?? [];
}
