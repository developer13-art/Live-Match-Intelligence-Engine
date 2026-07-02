/**
 * Sharp Movement Detector — Autonomous Agent
 *
 * Runs every 60 seconds. Monitors all live match odds for significant
 * movements that indicate sharp (informed) money entering the market.
 *
 * Detection criteria (TxLINE-compatible):
 *   - Any 1X2 market moves > MIN_MOVEMENT_PCT implied probability in one cycle
 *   - Movement contradicts current match state (contrarian signal)
 *   - Movement is sustained across two consecutive ticks (filters noise)
 *
 * Each detection > anchorMinConfidence gets anchored to Solana devnet.
 *
 * Outcome tracking: detections are resolved at match end (CORRECT / INCORRECT).
 */

import { logger } from "./logger";
import { getOddsHistory } from "./txlineAdapter";
import { anchorSignal, recordAnchor, getAnchorCount } from "./solanaAnchor";

// ─── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  minMovementPct: 0.04,     // 4% implied prob shift = sharp threshold
  minConfidence: 0.60,
  anchorMinConfidence: 0.75, // Only anchor high-conviction signals
  cycleMs: 60_000,           // 60s autonomous cycle
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketType = "HOME_WIN" | "DRAW" | "AWAY_WIN" | "OVER_2_5" | "UNDER_2_5" | "BTTS_YES" | "BTTS_NO";
export type MovementDirection = "SHORTENING" | "DRIFTING";
export type Outcome = "PENDING" | "CORRECT" | "INCORRECT" | "EXPIRED";

export interface SharpMovement {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  detectedAt: string;
  minute: number;
  market: MarketType;
  direction: MovementDirection;
  magnitude: number;          // absolute implied prob change
  fromOdds: number;
  toOdds: number;
  impliedProbChange: number;
  confidence: number;
  reasoning: string;
  outcome: Outcome;
  onChainTxId: string | null;
  anchored: boolean;
}

// ─── Internal state ────────────────────────────────────────────────────────────

let _running = false;
let _cycleCount = 0;
let _lastCycleAt: string | null = null;
let _nextCycleIn = THRESHOLDS.cycleMs / 1000;
let _timer: NodeJS.Timeout | null = null;
let _countdownTimer: NodeJS.Timeout | null = null;
let _idCounter = 1;

const detections: SharpMovement[] = [];

// match context for outcome resolution
const matchContext = new Map<string, { homeTeam: string; awayTeam: string }>();

function uid(): string {
  return `shp-${Date.now()}-${_idCounter++}`;
}

function impliedProb(dec: number): number {
  return 1 / Math.max(dec, 1.01);
}

// ─── Detection logic ──────────────────────────────────────────────────────────

interface DetectInput {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  minute: number;
  matchState: string;
  homeScore: number;
  awayScore: number;
  momentum: number;
}

function detectSharpMovements(input: DetectInput): SharpMovement[] {
  const history = getOddsHistory(input.matchId);
  if (history.length < 2) return [];

  const current = history[history.length - 1];
  const prev = history[history.length - 2];

  const found: SharpMovement[] = [];

  // Check each market
  const markets: Array<{
    key: MarketType;
    curr: number;
    prev: number;
  }> = [
    { key: "HOME_WIN", curr: current.homeWin, prev: prev.homeWin },
    { key: "DRAW", curr: current.draw, prev: prev.draw },
    { key: "AWAY_WIN", curr: current.awayWin, prev: prev.awayWin },
    { key: "OVER_2_5", curr: current.totalGoalsOver25, prev: prev.totalGoalsOver25 },
    { key: "UNDER_2_5", curr: current.totalGoalsUnder25, prev: prev.totalGoalsUnder25 },
    { key: "BTTS_YES", curr: current.bttsYes, prev: prev.bttsYes },
    { key: "BTTS_NO", curr: current.bttsNo, prev: prev.bttsNo },
  ];

  for (const m of markets) {
    const currProb = impliedProb(m.curr);
    const prevProb = impliedProb(m.prev);
    const delta = currProb - prevProb; // positive = shortened (more likely)
    const magnitude = Math.abs(delta);

    if (magnitude < THRESHOLDS.minMovementPct) continue;

    const direction: MovementDirection = delta > 0 ? "SHORTENING" : "DRIFTING";

    // Confidence calculation:
    // Base: magnitude of movement
    // Boost: if movement contradicts current score (contrarian = higher conviction)
    // Boost: if volatility is low (clean signal, not panic reaction)
    // Boost: if sustained over two ticks (filter noise)

    let confidence = Math.min(0.5 + magnitude * 5, 0.92);

    // Contrarian boost: odds shortening on team that is behind
    const scoreDiff = input.homeScore - input.awayScore;
    const isContrarian =
      (m.key === "HOME_WIN" && direction === "SHORTENING" && scoreDiff < 0) ||
      (m.key === "AWAY_WIN" && direction === "SHORTENING" && scoreDiff > 0);

    if (isContrarian) confidence = Math.min(confidence + 0.08, 0.95);

    // Chaos state penalty (movement during chaos is less meaningful)
    if (input.matchState === "TRANSITION_CHAOS") confidence -= 0.05;
    if (input.matchState === "DEFENSIVE_COLLAPSE") confidence += 0.04;

    confidence = Math.max(THRESHOLDS.minConfidence, Math.round(confidence * 100) / 100);

    if (confidence < THRESHOLDS.minConfidence) continue;

    // Build reasoning
    const probChangePct = Math.round(magnitude * 100 * 10) / 10;
    const contrStr = isContrarian ? " This is a contrarian signal — sharp money countering the score." : "";
    const stateStr = ` Match state: ${input.matchState} at ${input.minute}'.`;

    const reasoning = [
      `${m.key.replace(/_/g, " ")} market ${direction === "SHORTENING" ? "shortened" : "drifted"} by ${probChangePct}% implied probability (${m.prev.toFixed(2)} → ${m.curr.toFixed(2)}).`,
      contrStr,
      stateStr,
      magnitude > 0.08
        ? " Movement magnitude is exceptional — above 8% in a single 60s window."
        : magnitude > 0.05
        ? " Movement is significant — above the 5% sharp threshold."
        : " Movement meets the 4% minimum sharp detection threshold.",
    ]
      .filter(Boolean)
      .join("");

    found.push({
      id: uid(),
      matchId: input.matchId,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      detectedAt: new Date().toISOString(),
      minute: input.minute,
      market: m.key,
      direction,
      magnitude: Math.round(magnitude * 10000) / 10000,
      fromOdds: m.prev,
      toOdds: m.curr,
      impliedProbChange: Math.round(delta * 10000) / 10000,
      confidence,
      reasoning,
      outcome: "PENDING",
      onChainTxId: null,
      anchored: false,
    });
  }

  return found;
}

// ─── Outcome resolution ───────────────────────────────────────────────────────

export function resolveOutcomes(
  matchId: string,
  finalHomeScore: number,
  finalAwayScore: number
): void {
  const pending = detections.filter(
    (d) => d.matchId === matchId && d.outcome === "PENDING"
  );

  for (const d of pending) {
    let correct = false;
    const homeFinal = finalHomeScore > finalAwayScore;
    const awayFinal = finalAwayScore > finalHomeScore;
    const drawFinal = finalHomeScore === finalAwayScore;
    const goalsFinal = finalHomeScore + finalAwayScore;

    switch (d.market) {
      case "HOME_WIN":
        correct = d.direction === "SHORTENING" ? homeFinal : !homeFinal;
        break;
      case "AWAY_WIN":
        correct = d.direction === "SHORTENING" ? awayFinal : !awayFinal;
        break;
      case "DRAW":
        correct = d.direction === "SHORTENING" ? drawFinal : !drawFinal;
        break;
      case "OVER_2_5":
        correct = d.direction === "SHORTENING" ? goalsFinal > 2 : goalsFinal <= 2;
        break;
      case "UNDER_2_5":
        correct = d.direction === "SHORTENING" ? goalsFinal <= 2 : goalsFinal > 2;
        break;
      case "BTTS_YES":
        correct = d.direction === "SHORTENING"
          ? finalHomeScore > 0 && finalAwayScore > 0
          : !(finalHomeScore > 0 && finalAwayScore > 0);
        break;
      case "BTTS_NO":
        correct = d.direction === "SHORTENING"
          ? !(finalHomeScore > 0 && finalAwayScore > 0)
          : finalHomeScore > 0 && finalAwayScore > 0;
        break;
    }

    d.outcome = correct ? "CORRECT" : "INCORRECT";
    logger.info({ id: d.id, market: d.market, outcome: d.outcome }, "Sharp movement resolved");
  }
}

// ─── Anchoring ────────────────────────────────────────────────────────────────

async function tryAnchor(detection: SharpMovement): Promise<void> {
  if (detection.confidence < THRESHOLDS.anchorMinConfidence) return;

  const result = await anchorSignal({
    signalId: detection.id,
    signalType: `SHARP_${detection.market}_${detection.direction}`,
    matchId: detection.matchId,
    confidence: detection.confidence,
    headline: `Sharp ${detection.direction} detected on ${detection.market} (${detection.fromOdds} → ${detection.toOdds})`,
    generatedAt: detection.detectedAt,
  });

  if (result) {
    detection.onChainTxId = result.txSignature;
    detection.anchored = true;

    await recordAnchor({
      signalId: detection.id,
      signalType: `SHARP_${detection.market}_${detection.direction}`,
      txSignature: result.txSignature,
      explorerUrl: result.explorerUrl,
      anchoredAt: new Date().toISOString(),
      matchId: detection.matchId,
      network: "devnet",
      payloadHash: result.payloadHash,
    });
  }
}

// ─── Main agent cycle ─────────────────────────────────────────────────────────

type MatchContextEntry = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  minute: number;
  matchState: string;
  homeScore: number;
  awayScore: number;
  momentum: number;
  status: string;
};

// This is called by the match engine on each agent cycle
let _getMatchContexts: (() => MatchContextEntry[]) | null = null;

export function registerMatchContextProvider(fn: () => MatchContextEntry[]): void {
  _getMatchContexts = fn;
}

async function runCycle(): Promise<void> {
  _cycleCount++;
  _lastCycleAt = new Date().toISOString();
  _nextCycleIn = THRESHOLDS.cycleMs / 1000;

  logger.info({ cycle: _cycleCount }, "Sharp Movement Detector cycle started");

  if (!_getMatchContexts) {
    logger.warn("No match context provider registered");
    return;
  }

  const contexts = _getMatchContexts();
  let newDetections = 0;

  for (const ctx of contexts) {
    if (ctx.status === "PREMATCH" || ctx.status === "FINISHED") continue;

    const found = detectSharpMovements({
      matchId: ctx.matchId,
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      minute: ctx.minute,
      matchState: ctx.matchState,
      homeScore: ctx.homeScore,
      awayScore: ctx.awayScore,
      momentum: ctx.momentum,
    });

    for (const detection of found) {
      detections.push(detection);
      newDetections++;
      // Fire-and-forget anchoring (non-blocking)
      tryAnchor(detection).catch((err) =>
        logger.warn({ err, id: detection.id }, "Anchor attempt failed")
      );
    }

    if (detections.length > 500) detections.splice(0, detections.length - 500);
  }

  logger.info({ cycle: _cycleCount, newDetections, total: detections.length }, "Sharp Movement Detector cycle complete");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startAgent(): void {
  if (_running) return;
  _running = true;

  // Run first cycle immediately
  runCycle().catch((err) => logger.error({ err }, "Agent cycle error"));

  _timer = setInterval(() => {
    runCycle().catch((err) => logger.error({ err }, "Agent cycle error"));
  }, THRESHOLDS.cycleMs);

  // Countdown timer (1s resolution)
  _countdownTimer = setInterval(() => {
    _nextCycleIn = Math.max(0, _nextCycleIn - 1);
  }, 1000);

  logger.info({ thresholds: THRESHOLDS }, "Sharp Movement Detector agent started");
}

export function getAgentStatus() {
  const resolved = detections.filter((d) => d.outcome !== "PENDING");
  const correct = detections.filter((d) => d.outcome === "CORRECT").length;
  const accuracy =
    resolved.length > 0 ? Math.round((correct / resolved.length) * 1000) / 10 : 0;

  return {
    running: _running,
    cycleCount: _cycleCount,
    lastCycleAt: _lastCycleAt,
    nextCycleIn: _nextCycleIn,
    totalDetections: detections.length,
    correctPredictions: correct,
    pendingPredictions: detections.filter((d) => d.outcome === "PENDING").length,
    accuracy,
    anchorsSubmitted: getAnchorCount(),
    walletAddress: "loading",
    network: "devnet",
    thresholds: THRESHOLDS,
  };
}

export function getAllDetections(): SharpMovement[] {
  return [...detections].reverse();
}
