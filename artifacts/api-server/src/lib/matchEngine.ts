import { logger } from "./logger";
import { initOddsForMatch, tickOdds, fetchTxLineMatchList, type TxLineMatch } from "./txlineAdapter";
import { anchorSignal, recordAnchor } from "./solanaAnchor";
import { registerMatchContextProvider, resolveOutcomes } from "./sharpDetector";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchStatus =
  | "PREMATCH" | "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF" | "EXTRA_TIME" | "FINISHED";

export type MatchState =
  | "DOMINANCE_HOME" | "DOMINANCE_AWAY" | "PRESSURE_BUILD" | "TRANSITION_CHAOS"
  | "DEFENSIVE_COLLAPSE" | "STALEMATE" | "GAME_LOCK" | "MOMENTUM_SHIFT";

export type SignalType =
  | "MOMENTUM_SHIFT" | "STATE_TRANSITION" | "PRESSURE_BUILDUP" | "VOLATILITY_SPIKE"
  | "MARKET_INEFFICIENCY" | "DEFENSIVE_STRESS" | "DOMINANCE_CONFIRMED" | "FALSE_PRESSURE_DETECTED";

export type SignalStrength = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EventType =
  | "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "SHOT_ON_TARGET"
  | "SHOT_OFF_TARGET" | "CORNER" | "FOUL" | "VAR_CHECK" | "OFFSIDE";

export type NarrativeType =
  | "STATE_CHANGE" | "SIGNAL_FIRED" | "KEY_EVENT" | "MOMENTUM_NOTE" | "ANALYST_NOTE" | "RISK_ALERT";

export interface MatchIndices {
  momentum: number; pressure: number; volatility: number; marketLag: number;
  dominanceHome: number; dominanceAway: number; updatedAt: string;
}

export interface Signal {
  id: string; matchId: string; type: SignalType; strength: SignalStrength;
  confidence: number; headline: string; reasoning: string; factors: string[];
  riskWarnings: string[]; relevanceWindowMinutes: number; generatedAt: string;
  expiresAt: string; onChainTxId: string | null;
}

export interface NarrativeEntry {
  id: string; matchId: string; text: string; type: NarrativeType; minute: number; timestamp: string;
}

export interface MatchEvent {
  id: string; matchId: string; type: EventType; minute: number;
  team: "HOME" | "AWAY"; player: string | null; description: string; timestamp: string;
}

export interface StateHistoryEntry {
  state: MatchState; minute: number; timestamp: string; durationMinutes: number | null;
}

export interface Match {
  id: string; homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string;
  homeScore: number; awayScore: number; minute: number; addedTime: number | null;
  status: MatchStatus; matchState: MatchState; competition: string; venue: string;
  group: string; startedAt: string | null;
}

export interface MatchSnapshot {
  match: Match; indices: MatchIndices; signals: Signal[];
  narrative: NarrativeEntry[]; events: MatchEvent[]; stateHistory: StateHistoryEntry[];
}

// ─── Internal sim state ────────────────────────────────────────────────────────

interface MatchSimState {
  match: Match; indices: MatchIndices; signals: Signal[];
  narrative: NarrativeEntry[]; events: MatchEvent[]; stateHistory: StateHistoryEntry[];
  _homePressureRaw: number; _awayPressureRaw: number;
  _homeMomentumRaw: number; _awayMomentumRaw: number;
  _recentEventImpact: number; _tickCount: number;
  _lastStateChange: number; _stateDuration: number;
  _homeStrength: number; // 0-1 pre-match team quality
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 1;
function uid(): string { return `${Date.now()}-${_idCounter++}`; }
function clamp(v: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function randBetween(min: number, max: number): number { return min + Math.random() * (max - min); }
function prob(p: number): boolean { return Math.random() < p; }
function isoNow(): string { return new Date().toISOString(); }

// ─── World Cup 2026 – full fixture catalogue ──────────────────────────────────
// Matchday 3 (final group games) — July 1, 2026
// Four groups play simultaneously (2 matches per group = 8 live matches)

const WORLD_CUP_FIXTURES = [
  // Group H – MetLife Stadium / Levi's Stadium
  { home: "Belgium",     away: "Morocco",     homeFlag: "🇧🇪", awayFlag: "🇲🇦", group: "Group H", competition: "FIFA World Cup 2026", venue: "MetLife Stadium, New York",        homeStrength: 0.72 },
  { home: "Croatia",     away: "Canada",      homeFlag: "🇭🇷", awayFlag: "🇨🇦", group: "Group H", competition: "FIFA World Cup 2026", venue: "Levi's Stadium, San Francisco",    homeStrength: 0.62 },
  // Group I – AT&T Stadium / Rose Bowl
  { home: "Netherlands", away: "Japan",       homeFlag: "🇳🇱", awayFlag: "🇯🇵", group: "Group I", competition: "FIFA World Cup 2026", venue: "AT&T Stadium, Dallas",             homeStrength: 0.67 },
  { home: "Germany",     away: "South Korea", homeFlag: "🇩🇪", awayFlag: "🇰🇷", group: "Group I", competition: "FIFA World Cup 2026", venue: "Rose Bowl, Los Angeles",           homeStrength: 0.70 },
  // Group J – SoFi Stadium / Arrowhead Stadium
  { home: "Portugal",    away: "Uruguay",     homeFlag: "🇵🇹", awayFlag: "🇺🇾", group: "Group J", competition: "FIFA World Cup 2026", venue: "SoFi Stadium, Los Angeles",        homeStrength: 0.66 },
  { home: "Chile",       away: "Ecuador",     homeFlag: "🇨🇱", awayFlag: "🇪🇨", group: "Group J", competition: "FIFA World Cup 2026", venue: "Arrowhead Stadium, Kansas City",   homeStrength: 0.54 },
  // Group K – BC Place / NRG Stadium
  { home: "Switzerland", away: "Denmark",     homeFlag: "🇨🇭", awayFlag: "🇩🇰", group: "Group K", competition: "FIFA World Cup 2026", venue: "BC Place, Vancouver",              homeStrength: 0.60 },
  { home: "Serbia",      away: "Poland",      homeFlag: "🇷🇸", awayFlag: "🇵🇱", group: "Group K", competition: "FIFA World Cup 2026", venue: "NRG Stadium, Houston",             homeStrength: 0.58 },
];

// ─── Player pools ─────────────────────────────────────────────────────────────

const playerNames: Record<string, string[]> = {
  // Group H
  "Belgium":     ["De Bruyne", "Lukaku", "Tielemans", "Carrasco", "Courtois", "Vertonghen", "Witsel"],
  "Morocco":     ["Hakimi", "Ziyech", "En-Nesyri", "Amrabat", "Aguerd", "Bounou", "Ounahi"],
  "Croatia":     ["Modric", "Gvardiol", "Kovacic", "Perisic", "Livakovic", "Sucic", "Kramaric"],
  "Canada":      ["Davies", "David", "Buchanan", "Larin", "Hutchinson", "Johnston", "Laryea"],
  // Group I
  "Netherlands": ["Van Dijk", "Depay", "Gakpo", "De Jong", "Xavi Simons", "Flekken", "Timber"],
  "Japan":       ["Mitoma", "Kubo", "Kamada", "Endo", "Doan", "Gonda", "Tanaka"],
  "Germany":     ["Wirtz", "Havertz", "Musiala", "Kimmich", "Gnabry", "Neuer", "Rudiger"],
  "South Korea": ["Son", "Lee Kang-in", "Hwang Hee-chan", "Kim Min-jae", "Paik Seung-ho", "Kim Seung-gyu", "Cho Gue-sung"],
  // Group J
  "Portugal":    ["Ronaldo", "Leao", "Fernandes", "Felix", "Cancelo", "Diogo Costa", "Ruben Dias"],
  "Uruguay":     ["Valverde", "Nunez", "Suarez", "De Arrascaeta", "Gimenez", "Muslera", "Bentancur"],
  "Chile":       ["Sanchez", "Vidal", "Medel", "Brereton Diaz", "Pulgar", "Bravo", "Isla"],
  "Ecuador":     ["Caicedo", "Estupinan", "Valencia", "Plata", "Preciado", "Dominguez", "Minda"],
  // Group K
  "Switzerland": ["Xhaka", "Sow", "Embolo", "Vargas", "Akanji", "Sommer", "Freuler"],
  "Denmark":     ["Eriksen", "Hojlund", "Delaney", "Skov Olsen", "Christensen", "Schmeichel", "Jensen"],
  "Serbia":      ["Vlahovic", "Tadic", "Milinkovic-Savic", "Lukic", "Milenkovic", "Rajkovic", "Zivkovic"],
  "Poland":      ["Lewandowski", "Zielinski", "Szymanski", "Frankowski", "Bednarek", "Szczesny", "Grosicki"],
  // Additional teams referenced in narratives
  "Brazil":      ["Vinicius Jr", "Rodrygo", "Endrick", "Paqueta", "Militao", "Alisson", "Raphinha"],
  "Argentina":   ["Messi", "Di Maria", "Martinez", "De Paul", "Alvarez", "Romero", "Molina"],
  "France":      ["Mbappe", "Dembele", "Griezmann", "Camavinga", "Tchouameni", "Maignan", "Pavard"],
  "England":     ["Bellingham", "Saka", "Foden", "Rice", "Palmer", "Walker", "Alexander-Arnold"],
  "Spain":       ["Yamal", "Pedri", "Olmo", "Morata", "Rodri", "Carvajal", "Simon"],
  "USA":         ["Pulisic", "Reyna", "McKennie", "Adams", "Turner", "Dest", "Weah"],
};

function getPlayer(team: string): string {
  const pool = playerNames[team] ?? ["Unknown"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── State narratives ──────────────────────────────────────────────────────────

const STATE_NARRATIVES: Record<MatchState, string[]> = {
  DOMINANCE_HOME: [
    "The home side asserts clear territorial control, pinning the visitors deep.",
    "Complete home dominance — the opposition can barely breathe.",
    "Sustained home pressure is cracking the away defensive structure.",
  ],
  DOMINANCE_AWAY: [
    "The visitors have seized control — dictating tempo with clinical precision.",
    "Away side commanding this match, systematically dismantling the home shape.",
    "The home crowd grows restless as the away team takes complete ownership.",
  ],
  PRESSURE_BUILD: [
    "Pressure is mounting — the accumulated attacks are approaching critical mass.",
    "The intensity has risen sharply. We are approaching a decisive moment.",
    "A slow squeeze underway — the wave hasn't broken yet, but it's building fast.",
  ],
  TRANSITION_CHAOS: [
    "Frantic end-to-end football — both defensive lines completely exposed.",
    "Tactical shape has disintegrated — raw athletic transition football.",
    "The match has entered a chaotic phase with rapid switches in momentum.",
  ],
  DEFENSIVE_COLLAPSE: [
    "The defensive structure is fracturing — a critical vulnerability window is open.",
    "Multiple simultaneous breakdowns — this team is dangerously exposed.",
    "Defensive unit under severe strain. The back line cannot hold much longer.",
  ],
  STALEMATE: [
    "Both sides have settled into cautious equilibrium — neither willing to commit.",
    "Mutual cancellation: solid structures neutralizing the opposition's threat.",
    "The match is locked in stalemate — creative solutions in short supply.",
  ],
  GAME_LOCK: [
    "Complete attrition football. Both teams content to hold what they have.",
    "The next goal will almost certainly win this — neither side will open up.",
    "Game is locked. Tactical rigidity from both sides as the clock ticks down.",
  ],
  MOMENTUM_SHIFT: [
    "A decisive momentum shift is underway — the psychological balance has tipped.",
    "Something has changed. The team with initiative moments ago has lost it.",
    "This is the kind of shift that determines outcomes — energy has transferred.",
  ],
};

// ─── State selection ───────────────────────────────────────────────────────────

function selectMatchState(sim: MatchSimState): MatchState {
  const { _homeMomentumRaw: hm, _awayMomentumRaw: am,
    _homePressureRaw: hp, _awayPressureRaw: ap, _recentEventImpact: rei } = sim;
  const diff = hm - am;
  if (rei > 60) return "TRANSITION_CHAOS";
  if (rei > 45 && sim._stateDuration < 3) return "MOMENTUM_SHIFT";
  if (Math.abs(diff) > 40) return diff > 0 ? "DOMINANCE_HOME" : "DOMINANCE_AWAY";
  if (Math.abs(hp - ap) > 30 && Math.abs(diff) < 25) return "PRESSURE_BUILD";
  if (sim.match.status === "SECOND_HALF" && sim.match.minute > 70) {
    const sd = sim.match.homeScore - sim.match.awayScore;
    if (sd !== 0 && Math.abs(diff) < 20) return "GAME_LOCK";
  }
  if (Math.abs(diff) < 10 && rei < 20) return sim._stateDuration > 8 ? "STALEMATE" : "GAME_LOCK";
  if (Math.abs(diff) > 20 && rei > 30) return "DEFENSIVE_COLLAPSE";
  return "STALEMATE";
}

// ─── Index calculations ────────────────────────────────────────────────────────

function recalcIndices(sim: MatchSimState): MatchIndices {
  const n = () => (Math.random() - 0.5) * 4;
  const hm = clamp(sim._homeMomentumRaw + n());
  const am = clamp(sim._awayMomentumRaw + n());
  const hp = clamp(sim._homePressureRaw + n());
  const ap = clamp(sim._awayPressureRaw + n());
  const rei = clamp(sim._recentEventImpact + n());
  const momentum = clamp(50 + (hm - am) * 0.5);
  const pressure = clamp((hp + ap) * 0.5 * 0.8 + rei * 0.2);
  const volatility = clamp(rei * 0.6 + Math.abs(hm - am) * 0.2);
  const dominanceHome = clamp(hm * 0.7 + (100 - am) * 0.3);
  const dominanceAway = clamp(am * 0.7 + (100 - hm) * 0.3);
  const expectedMomentum = 50 + (sim.match.homeScore - sim.match.awayScore) * 12;
  const marketLag = clamp(Math.abs(momentum - clamp(expectedMomentum)) * 1.2 + randBetween(0, 10));
  return {
    momentum: Math.round(momentum * 10) / 10,
    pressure: Math.round(pressure * 10) / 10,
    volatility: Math.round(volatility * 10) / 10,
    marketLag: Math.round(marketLag * 10) / 10,
    dominanceHome: Math.round(dominanceHome * 10) / 10,
    dominanceAway: Math.round(dominanceAway * 10) / 10,
    updatedAt: isoNow(),
  };
}

// ─── Signal generation ─────────────────────────────────────────────────────────

async function tryGenerateSignal(sim: MatchSimState): Promise<Signal | null> {
  const { indices, match } = sim;
  const now = isoNow();
  const minutesLeft = match.status === "FIRST_HALF" ? 45 - match.minute : 90 - match.minute;
  let signal: Signal | null = null;

  if (indices.volatility > 75 && prob(0.7)) {
    const confidence = clamp(0.5 + indices.volatility * 0.004, 0, 1);
    signal = {
      id: uid(), matchId: match.id, type: "VOLATILITY_SPIKE",
      strength: indices.volatility > 88 ? "CRITICAL" : "HIGH",
      confidence,
      headline: "Extreme volatility — match on a knife's edge",
      reasoning: `Volatility index spiked to ${indices.volatility.toFixed(1)}, indicating severe tactical instability across both defensive lines.`,
      factors: [`Volatility: ${indices.volatility.toFixed(1)}/100`, "Transition frequency elevated", "Defensive shape breakdown", "Ball recovery rates falling"],
      riskWarnings: confidence < 0.7 ? ["High-volatility signals can be transient — monitor for confirmation"] : [],
      relevanceWindowMinutes: Math.max(3, Math.min(8, minutesLeft)),
      generatedAt: now, expiresAt: new Date(Date.now() + 8 * 60000).toISOString(), onChainTxId: null,
    };
  } else if (indices.marketLag > 65 && prob(0.6)) {
    const confidence = clamp(0.45 + indices.marketLag * 0.005, 0, 1);
    signal = {
      id: uid(), matchId: match.id, type: "MARKET_INEFFICIENCY",
      strength: indices.marketLag > 80 ? "HIGH" : "MEDIUM",
      confidence,
      headline: `Market lagging ${indices.marketLag.toFixed(0)} pts behind match reality`,
      reasoning: `Current state (${match.matchState}) diverges significantly from expected market positioning. Momentum at ${indices.momentum.toFixed(1)} contradicts standard pricing.`,
      factors: [`Market lag: ${indices.marketLag.toFixed(1)}/100`, `Momentum divergence: ${Math.abs(indices.momentum - 50).toFixed(1)} pts`, "Market typically lags 2-4 min in this phase"],
      riskWarnings: ["Observation only — not a trading instruction", confidence < 0.65 ? "Moderate confidence — corroborate with other indices" : ""].filter(Boolean),
      relevanceWindowMinutes: 5, generatedAt: now,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(), onChainTxId: null,
    };
  } else if (indices.pressure > 72 && prob(0.5)) {
    const confidence = clamp(0.5 + indices.pressure * 0.004, 0, 1);
    const attacking = indices.dominanceHome > indices.dominanceAway ? match.homeTeam : match.awayTeam;
    signal = {
      id: uid(), matchId: match.id, type: "PRESSURE_BUILDUP",
      strength: indices.pressure > 85 ? "HIGH" : "MEDIUM", confidence,
      headline: `Sustained pressure build — ${attacking} approaching critical mass`,
      reasoning: `Pressure index ${indices.pressure.toFixed(1)} — historically associated with a goal or set-piece within 5 minutes. Consistent entries into the final third.`,
      factors: [`Pressure: ${indices.pressure.toFixed(1)}/100`, "Sustained over 4+ minutes", "Multiple high-quality final-third entries", "Desperation clearances increasing"],
      riskWarnings: indices.pressure < 80 ? ["Pressure may dissipate without converting"] : [],
      relevanceWindowMinutes: 5, generatedAt: now,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(), onChainTxId: null,
    };
  } else if ((match.matchState === "DOMINANCE_HOME" || match.matchState === "DOMINANCE_AWAY") && sim._stateDuration > 6 && prob(0.4)) {
    const dominant = match.matchState === "DOMINANCE_HOME" ? match.homeTeam : match.awayTeam;
    const confidence = clamp(0.55 + sim._stateDuration * 0.02, 0, 0.92);
    signal = {
      id: uid(), matchId: match.id, type: "DOMINANCE_CONFIRMED",
      strength: sim._stateDuration > 10 ? "HIGH" : "MEDIUM", confidence,
      headline: `${dominant} dominance confirmed — ${sim._stateDuration}min sustained control`,
      reasoning: `State persisted ${sim._stateDuration} minutes above the 3-minute significance threshold. All control metrics favor ${dominant}.`,
      factors: [`Duration: ${sim._stateDuration}min`, `Momentum: ${indices.momentum.toFixed(1)}/100`, "Opposition failing to establish rhythm", "Consistent territorial pressure"],
      riskWarnings: ["Dominance can end suddenly from set-piece or counter", "Territory ≠ conversion certainty"],
      relevanceWindowMinutes: 6, generatedAt: now,
      expiresAt: new Date(Date.now() + 6 * 60000).toISOString(), onChainTxId: null,
    };
  } else if (match.matchState === "MOMENTUM_SHIFT" && prob(0.75)) {
    const gaining = indices.momentum > 55 ? match.homeTeam : match.awayTeam;
    const confidence = clamp(0.6 + Math.abs(indices.momentum - 50) * 0.006, 0, 0.95);
    signal = {
      id: uid(), matchId: match.id, type: "MOMENTUM_SHIFT",
      strength: Math.abs(indices.momentum - 50) > 20 ? "HIGH" : "MEDIUM", confidence,
      headline: `Momentum transferring to ${gaining} — psychological inflection point`,
      reasoning: `Momentum index has swung direction. ${gaining} capturing initiative. State transition data confirms structural shift, not noise.`,
      factors: [`Momentum: ${indices.momentum.toFixed(1)}/100`, "Structural state transition", "Pressing intensity shifted", "Opposition losing ball in dangerous areas"],
      riskWarnings: ["Shifts can reverse within 2-3 min on a key event", "Set-piece driven momentum has lower predictive value"],
      relevanceWindowMinutes: 4, generatedAt: now,
      expiresAt: new Date(Date.now() + 4 * 60000).toISOString(), onChainTxId: null,
    };
  } else if (match.matchState === "DEFENSIVE_COLLAPSE" && prob(0.8)) {
    const attacking = indices.dominanceHome > indices.dominanceAway ? match.homeTeam : match.awayTeam;
    signal = {
      id: uid(), matchId: match.id, type: "DEFENSIVE_STRESS", strength: "CRITICAL",
      confidence: 0.82,
      headline: `Defensive collapse — ${attacking} positioned to exploit`,
      reasoning: `Match in DEFENSIVE_COLLAPSE. Multiple structural breakdowns simultaneously. High-probability scoring window open.`,
      factors: ["Defensive organisation: critical", "Multiple simultaneous breakdowns", `High press from ${attacking} succeeding`, "Goalkeeper positioning exposed"],
      riskWarnings: ["State median duration: 2.5min — window may close quickly", "False positives ~18% in this state"],
      relevanceWindowMinutes: 3, generatedAt: now,
      expiresAt: new Date(Date.now() + 3 * 60000).toISOString(), onChainTxId: null,
    };
  } else if (indices.pressure > 55 && indices.volatility < 30 && prob(0.25)) {
    signal = {
      id: uid(), matchId: match.id, type: "FALSE_PRESSURE_DETECTED", strength: "LOW",
      confidence: 0.71,
      headline: "Caution: low-quality pressure detected — surface appearance misleading",
      reasoning: `Despite pressure at ${indices.pressure.toFixed(1)}, cross-referencing with volatility (${indices.volatility.toFixed(1)}) reveals positional rather than dangerous pressure. No real penetration.`,
      factors: ["Shots from distance only", "Opposition defensive block intact", "Low crossing accuracy — ~23%"],
      riskWarnings: ["Suppression signal — protects against premature conclusions", "Monitor: genuine pressure can develop from positional pressure"],
      relevanceWindowMinutes: 4, generatedAt: now,
      expiresAt: new Date(Date.now() + 4 * 60000).toISOString(), onChainTxId: null,
    };
  }

  // Try Solana anchoring for high-confidence signals
  if (signal && signal.confidence >= 0.75 && prob(0.4)) {
    const result = await anchorSignal({
      signalId: signal.id,
      signalType: signal.type,
      matchId: signal.matchId,
      confidence: signal.confidence,
      headline: signal.headline,
      generatedAt: signal.generatedAt,
    });
    if (result) {
      signal.onChainTxId = result.txSignature;
      await recordAnchor({
        signalId: signal.id,
        signalType: signal.type,
        txSignature: result.txSignature,
        explorerUrl: result.explorerUrl,
        anchoredAt: isoNow(),
        matchId: signal.matchId,
        network: "devnet",
        payloadHash: result.payloadHash,
      });
    }
  }

  return signal;
}

// ─── Event generation ─────────────────────────────────────────────────────────

function tryGenerateEvent(sim: MatchSimState): MatchEvent | null {
  const { match, indices } = sim;
  const baseP = 0.05 + indices.pressure * 0.002
    + (match.matchState === "TRANSITION_CHAOS" ? 0.08 : 0)
    + (match.matchState === "DEFENSIVE_COLLAPSE" ? 0.12 : 0);
  if (!prob(baseP)) return null;

  const isHome = indices.dominanceHome > indices.dominanceAway ? prob(0.65) : prob(0.35);
  const team: "HOME" | "AWAY" = isHome ? "HOME" : "AWAY";
  const teamName = isHome ? match.homeTeam : match.awayTeam;
  const player = getPlayer(teamName);
  const r = Math.random();
  let type: EventType;
  let description: string;

  if (r < 0.12 && match.matchState === "DEFENSIVE_COLLAPSE") {
    type = "GOAL";
    if (isHome) sim.match.homeScore++; else sim.match.awayScore++;
    description = `${player} converts! ${teamName} score!`;
  } else if (r < 0.25) {
    type = "SHOT_ON_TARGET"; description = `${player} forces a save.`;
  } else if (r < 0.40) {
    type = "SHOT_OFF_TARGET"; description = `${player} fires wide.`;
  } else if (r < 0.55) {
    type = "CORNER"; description = `Corner awarded to ${teamName}.`;
  } else if (r < 0.65) {
    type = "FOUL"; description = `Foul by ${player}. Referee stops play.`;
  } else if (r < 0.72) {
    type = "YELLOW_CARD";
    description = `${player} is booked for a ${prob(0.5) ? "cynical" : "reckless"} challenge.`;
    sim._recentEventImpact = clamp(sim._recentEventImpact + 20);
  } else if (r < 0.76 && match.minute > 60) {
    type = "SUBSTITUTION";
    const incoming = getPlayer(teamName);
    description = `${incoming} comes on to change the dynamic.`;
  } else if (r < 0.80) {
    type = "OFFSIDE"; description = `${player} caught offside — marginal decision.`;
  } else if (r < 0.83) {
    type = "VAR_CHECK"; description = `VAR check underway — play halted.`;
    sim._recentEventImpact = clamp(sim._recentEventImpact + 15);
  } else if (r < 0.86 && match.minute > 30) {
    type = "RED_CARD";
    description = `${player} receives a straight red card! Down to 10 men.`;
    sim._recentEventImpact = clamp(sim._recentEventImpact + 40);
    if (isHome) {
      sim._awayMomentumRaw = clamp(sim._awayMomentumRaw + 30);
      sim._homeMomentumRaw = clamp(sim._homeMomentumRaw - 25);
    } else {
      sim._homeMomentumRaw = clamp(sim._homeMomentumRaw + 30);
      sim._awayMomentumRaw = clamp(sim._awayMomentumRaw - 25);
    }
  } else {
    type = "SHOT_OFF_TARGET"; description = `${player} tries from distance — wide.`;
  }

  if (type === "GOAL") {
    sim._recentEventImpact = clamp(sim._recentEventImpact + 50);
    if (isHome) {
      sim._homeMomentumRaw = clamp(sim._homeMomentumRaw + 20);
      sim._awayMomentumRaw = clamp(sim._awayMomentumRaw - 15);
    } else {
      sim._awayMomentumRaw = clamp(sim._awayMomentumRaw + 20);
      sim._homeMomentumRaw = clamp(sim._homeMomentumRaw - 15);
    }
  }

  return {
    id: uid(), matchId: match.id, type, minute: match.minute, team,
    player: type === "CORNER" || type === "OFFSIDE" ? null : player,
    description, timestamp: isoNow(),
  };
}

// ─── Narrative ────────────────────────────────────────────────────────────────

function narrativeForState(sim: MatchSimState, prevState: MatchState | null): NarrativeEntry | null {
  if (prevState === sim.match.matchState) return null;
  const texts = STATE_NARRATIVES[sim.match.matchState];
  return {
    id: uid(), matchId: sim.match.id,
    text: texts[Math.floor(Math.random() * texts.length)],
    type: "STATE_CHANGE", minute: sim.match.minute, timestamp: isoNow(),
  };
}

function narrativeForSignal(sim: MatchSimState, signal: Signal): NarrativeEntry {
  return {
    id: uid(), matchId: sim.match.id,
    text: `Intelligence: ${signal.headline}`,
    type: "SIGNAL_FIRED", minute: sim.match.minute, timestamp: isoNow(),
  };
}

function narrativeForEvent(sim: MatchSimState, event: MatchEvent): NarrativeEntry {
  return {
    id: uid(), matchId: sim.match.id, text: event.description,
    type: event.type === "GOAL" || event.type === "RED_CARD" ? "KEY_EVENT" : "MOMENTUM_NOTE",
    minute: event.minute, timestamp: isoNow(),
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

const TICK_MS = 8000;

async function tick(sim: MatchSimState): Promise<void> {
  const { match } = sim;
  sim._tickCount++;

  const minuteAdv = prob(0.6) ? 1 : 0;

  if (match.status === "FIRST_HALF") {
    match.minute += minuteAdv;
    if (match.minute >= 45) {
      match.addedTime = prob(0.5) ? Math.floor(randBetween(1, 5)) : null;
      if (match.minute >= 45 + (match.addedTime ?? 0)) {
        match.status = "HALF_TIME"; match.minute = 45; match.addedTime = null;
        sim.narrative.push({ id: uid(), matchId: match.id, text: `Half-time. ${match.homeTeam} ${match.homeScore}–${match.awayScore} ${match.awayTeam}.`, type: "KEY_EVENT", minute: 45, timestamp: isoNow() });
        return;
      }
    }
  } else if (match.status === "HALF_TIME") {
    if (sim._tickCount % 2 === 0) {
      match.status = "SECOND_HALF"; match.minute = 46;
      sim.narrative.push({ id: uid(), matchId: match.id, text: "Second half underway. Tactical adjustments expected.", type: "KEY_EVENT", minute: 46, timestamp: isoNow() });
      sim._homeMomentumRaw = lerp(sim._homeMomentumRaw, 50, 0.4);
      sim._awayMomentumRaw = lerp(sim._awayMomentumRaw, 50, 0.4);
      sim._recentEventImpact = lerp(sim._recentEventImpact, 20, 0.5);
    }
    return;
  } else if (match.status === "SECOND_HALF") {
    match.minute += minuteAdv;
    if (match.minute >= 90) {
      match.addedTime = Math.floor(randBetween(3, 8));
      if (match.minute >= 90 + match.addedTime) {
        match.status = "FINISHED"; match.addedTime = null;
        sim.narrative.push({ id: uid(), matchId: match.id, text: `Full-time. ${match.homeTeam} ${match.homeScore}–${match.awayScore} ${match.awayTeam}.`, type: "KEY_EVENT", minute: 90, timestamp: isoNow() });
        resolveOutcomes(match.id, match.homeScore, match.awayScore);
        return;
      }
    }
  }

  // Drift raw values
  const md = (Math.random() - 0.48) * 6;
  const pd = (Math.random() - 0.5) * 8;
  sim._homeMomentumRaw = clamp(lerp(sim._homeMomentumRaw + md, 50, 0.04));
  sim._awayMomentumRaw = clamp(lerp(sim._awayMomentumRaw - md * 0.8, 50, 0.04));
  sim._homePressureRaw = clamp(sim._homePressureRaw + pd);
  sim._awayPressureRaw = clamp(sim._awayPressureRaw - pd * 0.7);
  sim._recentEventImpact = clamp(sim._recentEventImpact * 0.88);
  sim.indices = recalcIndices(sim);

  // Tick odds (TxLINE adapter — async: real API when key present, sim otherwise)
  await tickOdds(match.id, match.minute, match.homeScore, match.awayScore, sim.indices.momentum, sim.indices.volatility);

  // State machine
  const prevState = match.matchState;
  const newState = selectMatchState(sim);
  if (newState !== prevState) {
    match.matchState = newState;
    sim._stateDuration = 0; sim._lastStateChange = match.minute;
    const last = sim.stateHistory[sim.stateHistory.length - 1];
    if (last && last.durationMinutes === null) last.durationMinutes = match.minute - last.minute;
    sim.stateHistory.push({ state: newState, minute: match.minute, timestamp: isoNow(), durationMinutes: null });
    const ne = narrativeForState(sim, prevState);
    if (ne) sim.narrative.push(ne);
  } else {
    sim._stateDuration++;
  }

  // Events
  const event = tryGenerateEvent(sim);
  if (event) {
    sim.events.push(event);
    sim.narrative.push(narrativeForEvent(sim, event));
    if (event.type === "GOAL") {
      sim.narrative.push({ id: uid(), matchId: match.id, text: "GOAL CONFIRMED. Systems recalibrating — significant index movements incoming.", type: "ANALYST_NOTE", minute: match.minute, timestamp: isoNow() });
    }
  }

  // Signals (async — non-blocking)
  if (prob(0.35)) {
    tryGenerateSignal(sim).then((signal) => {
      if (signal) {
        sim.signals.push(signal);
        sim.narrative.push(narrativeForSignal(sim, signal));
      }
    }).catch(() => {});
  }

  // Risk alerts
  if (sim.indices.volatility > 85 && prob(0.5)) {
    sim.narrative.push({ id: uid(), matchId: match.id, text: `Risk alert: volatility at ${sim.indices.volatility.toFixed(0)} — system confidence in state classification is reduced.`, type: "RISK_ALERT", minute: match.minute, timestamp: isoNow() });
  }

  // Trim
  if (sim.narrative.length > 50) sim.narrative = sim.narrative.slice(-50);
  if (sim.signals.length > 30) sim.signals = sim.signals.slice(-30);
  if (sim.events.length > 60) sim.events = sim.events.slice(-60);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const simulations = new Map<string, MatchSimState>();
let engineTimer: NodeJS.Timeout | null = null;

function createMatchSim(
  fixture: typeof WORLD_CUP_FIXTURES[0],
  startMinute: number
): MatchSimState {
  const id = uid();
  const now = isoNow();
  const status: MatchStatus = startMinute < 45 ? "FIRST_HALF" : startMinute < 46 ? "HALF_TIME" : "SECOND_HALF";
  const hm = randBetween(30, 70);
  const am = 100 - hm;

  const sim: MatchSimState = {
    match: {
      id, homeTeam: fixture.home, awayTeam: fixture.away,
      homeFlag: fixture.homeFlag, awayFlag: fixture.awayFlag,
      homeScore: 0, awayScore: 0, minute: startMinute || 1, addedTime: null,
      status, matchState: "STALEMATE",
      competition: fixture.competition, venue: fixture.venue, group: fixture.group,
      startedAt: now,
    },
    indices: { momentum: 50, pressure: 40, volatility: 25, marketLag: 10, dominanceHome: hm, dominanceAway: am, updatedAt: now },
    signals: [], narrative: [], events: [],
    stateHistory: [{ state: "STALEMATE", minute: startMinute || 1, timestamp: now, durationMinutes: null }],
    _homePressureRaw: randBetween(25, 65), _awayPressureRaw: randBetween(20, 60),
    _homeMomentumRaw: hm, _awayMomentumRaw: am,
    _recentEventImpact: randBetween(10, 30),
    _tickCount: 0, _lastStateChange: startMinute || 1, _stateDuration: 0,
    _homeStrength: fixture.homeStrength,
  };

  // Simulate some history if starting mid-match
  if (startMinute > 10) {
    const goals = Math.floor(randBetween(0, startMinute / 30));
    for (let g = 0; g < goals; g++) {
      if (prob(fixture.homeStrength)) sim.match.homeScore++;
      else sim.match.awayScore++;
    }
  }

  initOddsForMatch(id, fixture.homeStrength, startMinute);

  sim.narrative.push({
    id: uid(), matchId: id,
    text: `LMIE initialized. ${fixture.home} vs ${fixture.away} | ${fixture.competition} | ${fixture.venue} | ${startMinute}'`,
    type: "ANALYST_NOTE", minute: startMinute || 1, timestamp: now,
  });

  return sim;
}

// Flag set once we've tried (and possibly succeeded with) TxLINE match list
let _txlineMatchesLoaded = false;

function fixtureFromTxLine(m: TxLineMatch, idx: number): typeof WORLD_CUP_FIXTURES[0] {
  // Derive home strength from index for variety; real strength unknown from API
  const strength = 0.45 + (idx % 6) * 0.05;
  return {
    home: m.homeTeam,
    away: m.awayTeam,
    homeFlag: "🏳️",   // TxLINE doesn't supply flags
    awayFlag: "🏳️",
    group: m.group ?? "Group Stage",
    competition: m.competition ?? "FIFA World Cup 2026",
    venue: m.venue ?? "World Cup Venue",
    homeStrength: strength,
  };
}

export async function initEngine(): Promise<void> {
  // ── Try TxLINE live match list first ──────────────────────────────────────
  if (!_txlineMatchesLoaded) {
    _txlineMatchesLoaded = true;
    const liveMatches = await fetchTxLineMatchList();
    if (liveMatches && liveMatches.length > 0) {
      logger.info({ count: liveMatches.length }, "TxLINE live matches loaded — using real fixture data");
      for (let i = 0; i < liveMatches.length; i++) {
        const m = liveMatches[i];
        const fixture = fixtureFromTxLine(m, i);
        const startMin = m.minute > 0 ? m.minute : (5 + i * 10);
        const sim = createMatchSim(fixture, Math.min(startMin, 89));
        // Seed score from real API
        if (m.homeScore) sim.match.homeScore = m.homeScore;
        if (m.awayScore) sim.match.awayScore = m.awayScore;
        simulations.set(sim.match.id, sim);
        logger.info({ matchId: sim.match.id, fixture: `${m.homeTeam} vs ${m.awayTeam}`, minute: startMin }, "Match initialized from TxLINE data");
      }
      // Skip hardcoded fallback
      _finishEngineInit();
      return;
    }
    logger.info("TxLINE match list unavailable — using World Cup 2026 Matchday 3 schedule");
  }

  // ── Hardcoded Matchday 3 fallback (July 1, 2026) ─────────────────────────
  // Stagger kickoffs so each match is at a different stage on load.
  const startMinutes = [8, 19, 33, 47, 61, 72, 24, 55];
  WORLD_CUP_FIXTURES.forEach((fixture, i) => {
    const sim = createMatchSim(fixture, startMinutes[i] ?? 5);
    simulations.set(sim.match.id, sim);
    logger.info({ matchId: sim.match.id, fixture: `${fixture.home} vs ${fixture.away}`, minute: startMinutes[i] }, "Match simulation initialized");
  });

  _finishEngineInit();
}

function _finishEngineInit(): void {
  registerMatchContextProvider(() =>
    Array.from(simulations.values()).map((s) => ({
      matchId: s.match.id,
      homeTeam: s.match.homeTeam,
      awayTeam: s.match.awayTeam,
      minute: s.match.minute,
      matchState: s.match.matchState,
      homeScore: s.match.homeScore,
      awayScore: s.match.awayScore,
      momentum: s.indices.momentum,
      status: s.match.status,
    }))
  );

  engineTimer = setInterval(() => {
    for (const [id, sim] of simulations.entries()) {
      if (sim.match.status === "FINISHED") {
        // Restart the same fixture from kick-off
        const fixture = WORLD_CUP_FIXTURES.find((f) => f.home === sim.match.homeTeam)
          ?? WORLD_CUP_FIXTURES[0];
        const newSim = createMatchSim(fixture, 1);
        simulations.set(newSim.match.id, newSim);
        simulations.delete(id);
        logger.info({ newMatchId: newSim.match.id, fixture: `${fixture.home} vs ${fixture.away}` }, "Match restarted");
        continue;
      }
      tick(sim).catch((err) => logger.error({ err, matchId: id }, "Tick error"));
    }
  }, TICK_MS);

  logger.info("LMIE engine started");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAllMatches(): Match[] {
  return Array.from(simulations.values()).map((s) => s.match);
}

export function getMatch(matchId: string): Match | null {
  return simulations.get(matchId)?.match ?? null;
}

export function getMatchSnapshot(matchId: string): MatchSnapshot | null {
  const sim = simulations.get(matchId);
  if (!sim) return null;
  return {
    match: sim.match, indices: sim.indices,
    signals: [...sim.signals].reverse().slice(0, 15),
    narrative: [...sim.narrative].reverse().slice(0, 25),
    events: [...sim.events].reverse().slice(0, 30),
    stateHistory: sim.stateHistory,
  };
}

export function getSignals(matchId: string): Signal[] {
  return [...(simulations.get(matchId)?.signals ?? [])].reverse().slice(0, 20);
}

export function getNarrative(matchId: string): NarrativeEntry[] {
  return [...(simulations.get(matchId)?.narrative ?? [])].reverse().slice(0, 30);
}

export function getEvents(matchId: string): MatchEvent[] {
  return [...(simulations.get(matchId)?.events ?? [])].reverse().slice(0, 40);
}

export function getIntelligenceSummary() {
  const all = Array.from(simulations.values());
  const live = all.filter((s) => s.match.status !== "PREMATCH" && s.match.status !== "FINISHED");
  const highConf = live.reduce((acc, s) => acc + s.signals.filter((sig) => sig.confidence >= 0.7 && sig.strength !== "LOW").length, 0);
  const stateMap = new Map<string, number>();
  live.forEach((s) => stateMap.set(s.match.matchState, (stateMap.get(s.match.matchState) ?? 0) + 1));
  const avgVol = live.length > 0 ? live.reduce((a, s) => a + s.indices.volatility, 0) / live.length : 0;
  const avgLag = live.length > 0 ? live.reduce((a, s) => a + s.indices.marketLag, 0) / live.length : 0;
  const mktIneff = live.reduce((a, s) => a + s.signals.filter((sig) => sig.type === "MARKET_INEFFICIENCY").length, 0);
  return {
    totalLiveMatches: live.length,
    highConfidenceSignals: highConf,
    activeStates: Array.from(stateMap.entries()).map(([state, count]) => ({ state, count })),
    avgVolatility: Math.round(avgVol * 10) / 10,
    marketInefficiencies: mktIneff,
    updatedAt: isoNow(),
    sharpMovements: 0, // filled by agent route
    anchorsOnChain: 0, // filled by agent route
    agentCycles: 0,    // filled by agent route
    avgMarketLag: Math.round(avgLag * 10) / 10,
  };
}
