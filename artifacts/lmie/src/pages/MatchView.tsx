import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetMatchSnapshot, getGetMatchSnapshotQueryKey,
  useGetMatchOdds, getGetMatchOddsQueryKey,
  useGetOddsHistory, getGetOddsHistoryQueryKey,
  useListDetections, getListDetectionsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StateBadge } from "@/components/shared/StateBadge";
import { IndexBar } from "@/components/shared/IndexBar";
import { SignalCard } from "@/components/match/SignalCard";
import { NarrativeFeed } from "@/components/match/NarrativeFeed";
import { IndicesDashboard } from "@/components/match/IndicesDashboard";
import { MatchEventsLog } from "@/components/match/MatchEventsLog";
import { StateHistoryTimeline } from "@/components/match/StateHistoryTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Zap, LayoutGrid, Link2, Activity } from "lucide-react";

function OddsMovementArrow({ movement }: { movement: number }) {
  if (movement < -0.01) return <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />;
  if (movement > 0.01) return <TrendingUp className="h-3.5 w-3.5 text-red-400" />;
  return <span className="text-muted-foreground text-xs font-mono">—</span>;
}

function OddsCell({ label, curr, prev, movement }: { label: string; curr: number; prev: number; movement: number }) {
  const isShortened = movement < -0.01;
  const isDrifted = movement > 0.01;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`text-xl font-bold font-mono tabular-nums ${isShortened ? "text-emerald-400" : isDrifted ? "text-red-400" : "text-foreground"}`}>
        {curr.toFixed(2)}
      </div>
      <div className="flex items-center gap-1">
        <OddsMovementArrow movement={movement} />
        <span className="text-[10px] font-mono text-muted-foreground">{prev.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function MatchView() {
  const { matchId } = useParams();
  const [mode, setMode] = useState<"FAN" | "ANALYST">("ANALYST");

  const { data: snapshot, isLoading, error } = useGetMatchSnapshot(matchId ?? "", {
    query: { enabled: !!matchId, queryKey: getGetMatchSnapshotQueryKey(matchId ?? ""), refetchInterval: 3000 }
  });
  const { data: odds } = useGetMatchOdds(matchId ?? "", {
    query: { enabled: !!matchId, queryKey: getGetMatchOddsQueryKey(matchId ?? ""), refetchInterval: 3000 }
  });
  const { data: oddsHistory } = useGetOddsHistory(matchId ?? "", {
    query: { enabled: !!matchId, queryKey: getGetOddsHistoryQueryKey(matchId ?? ""), refetchInterval: 5000 }
  });
  const { data: allDetections } = useListDetections({
    query: { queryKey: getListDetectionsQueryKey(), refetchInterval: 10000 }
  });

  const matchDetections = (allDetections ?? []).filter(d => d.matchId === matchId);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !snapshot) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-bold text-destructive">Failed to load match intelligence</h2>
        </div>
      </AppLayout>
    );
  }

  const { match, indices, signals, narrative, events, stateHistory } = snapshot;

  // Chart data
  const chartData = (oddsHistory ?? []).map((h, i) => ({
    i,
    min: h.minute,
    home: Number(h.homeWin.toFixed(3)),
    draw: Number(h.draw.toFixed(3)),
    away: Number(h.awayWin.toFixed(3)),
  }));

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Match Header */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {match.competition} · {match.venue}
              </div>
              <div className="flex items-center gap-4 text-2xl font-bold tracking-tight">
                <span className="flex items-center gap-2">
                  <span className="text-3xl">{match.homeFlag}</span>
                  <span>{match.homeTeam}</span>
                </span>
                <span className="font-mono text-primary text-3xl tabular-nums">
                  {match.homeScore} – {match.awayScore}
                </span>
                <span className="flex items-center gap-2">
                  <span>{match.awayTeam}</span>
                  <span className="text-3xl">{match.awayFlag}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-primary animate-pulse font-bold text-sm">
                  {match.minute}'{match.addedTime ? `+${match.addedTime}` : ""}
                </span>
                <StateBadge state={match.matchState} size="md" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === "FAN" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("FAN")}
                className="font-mono text-xs"
                data-testid="btn-fan-mode"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" /> FAN
              </Button>
              <Button
                variant={mode === "ANALYST" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("ANALYST")}
                className="font-mono text-xs"
                data-testid="btn-analyst-mode"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> ANALYST
              </Button>
            </div>
          </div>
        </div>

        {mode === "FAN" ? (
          /* FAN MODE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[500px]">
            <div className="lg:col-span-2 bg-card/40 border border-border/50 rounded-xl p-6 flex flex-col">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Match Flow
              </h3>
              <div className="flex-1 flex flex-col justify-center items-center space-y-8">
                {/* Big Momentum Gauge */}
                <div className="w-full max-w-md space-y-3">
                  <div className="flex justify-between text-sm font-bold font-mono">
                    <span className="text-blue-400 flex items-center gap-1">
                      <span className="text-xl">{match.homeFlag}</span> {match.homeTeam}
                    </span>
                    <span className="text-violet-400 flex items-center gap-1">
                      {match.awayTeam} <span className="text-xl">{match.awayFlag}</span>
                    </span>
                  </div>
                  <div className="relative h-6 w-full bg-secondary/60 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                      style={{ width: `${indices.dominanceHome}%` }}
                    />
                    <div
                      className="absolute right-0 top-0 h-full bg-gradient-to-l from-violet-600 to-violet-400 transition-all duration-1000"
                      style={{ width: `${indices.dominanceAway}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-white/80 uppercase tracking-widest">Dominance</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-blue-400">{Math.round(indices.dominanceHome)}%</span>
                    <span className="text-violet-400">{Math.round(indices.dominanceAway)}%</span>
                  </div>
                </div>

                {/* Index Bars */}
                <div className="w-full max-w-md space-y-3">
                  <IndexBar label="Momentum" value={indices.momentum} color="primary" thick />
                  <IndexBar label="Pressure" value={indices.pressure} color="amber" thick />
                  <IndexBar label="Volatility" value={indices.volatility} color="red" thick />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="flex-1 min-h-[300px]">
                <NarrativeFeed entries={narrative} />
              </div>
              <div className="flex-1 min-h-[200px]">
                <MatchEventsLog events={events} />
              </div>
            </div>
          </div>
        ) : (
          /* ANALYST MODE */
          <div className="space-y-5">
            {/* Row 1: Odds Panel + Odds History Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Odds Panel */}
              <div className="lg:col-span-2 bg-card/50 border border-border/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">TxLINE Odds</span>
                  {odds?.sharpMovementFlag && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/30 border border-amber-800/30 px-2 py-0.5 rounded-full animate-pulse">
                      <TrendingUp className="h-3 w-3" /> SHARP MOVE DETECTED
                    </span>
                  )}
                </div>

                {odds ? (
                  <div className="space-y-4">
                    {/* 1X2 */}
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                      <div className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wider">1X2 Full Time</div>
                      <div className="grid grid-cols-3 gap-2">
                        <OddsCell label="Home" curr={odds.homeWin} prev={odds.homeWinPrev} movement={odds.homeWinMovement} />
                        <OddsCell label="Draw" curr={odds.draw} prev={odds.drawPrev} movement={odds.drawMovement} />
                        <OddsCell label="Away" curr={odds.awayWin} prev={odds.awayWinPrev} movement={odds.awayWinMovement} />
                      </div>
                    </div>

                    {/* O/U 2.5 */}
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                      <div className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wider">Over / Under 2.5</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">OVER</div>
                          <div className="text-lg font-bold font-mono text-foreground tabular-nums">{odds.totalGoalsOver25.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">UNDER</div>
                          <div className="text-lg font-bold font-mono text-foreground tabular-nums">{odds.totalGoalsUnder25.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* BTTS */}
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                      <div className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wider">BTTS</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">YES</div>
                          <div className="text-lg font-bold font-mono text-foreground tabular-nums">{odds.bttsYes.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">NO</div>
                          <div className="text-lg font-bold font-mono text-foreground tabular-nums">{odds.bttsNo.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-muted-foreground/50 text-right">
                      Lag: {odds.consensusLag.toFixed(1)}s
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm font-mono">Loading odds…</div>
                )}
              </div>

              {/* Odds History Chart */}
              <div className="lg:col-span-3 bg-card/50 border border-border/50 rounded-xl p-4">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-4">
                  1X2 Odds History ({chartData.length} ticks)
                </div>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis
                        dataKey="min"
                        tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${v}'`}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={v => v.toFixed(2)}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{ background: "#0f1629", border: "1px solid #1e2d4a", borderRadius: 6, fontSize: 11, fontFamily: "monospace" }}
                        labelFormatter={v => `${v}'`}
                        formatter={(value: number) => [value.toFixed(3), ""]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                        iconType="line"
                      />
                      <Line type="monotone" dataKey="home" name="Home" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="draw" name="Draw" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="away" name="Away" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-mono">
                    Accumulating odds history…
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Indices + Signals + Narrative/Events */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Indices + State History */}
              <div className="lg:col-span-1 space-y-4">
                <IndicesDashboard indices={indices} />
                <div className="min-h-[250px]">
                  <StateHistoryTimeline history={stateHistory} />
                </div>
              </div>

              {/* Signals */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold uppercase tracking-wider">Active Signals</span>
                  <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">
                    {signals.length} DETECTED
                  </span>
                </div>
                <div className="space-y-3">
                  {signals.length > 0 ? (
                    signals.map(s => <SignalCard key={s.id} signal={s} />)
                  ) : (
                    <div className="text-center py-12 border border-dashed border-border/50 rounded-xl text-muted-foreground text-sm font-mono">
                      No high-confidence signals detected
                    </div>
                  )}
                </div>

                {/* Sharp Movements for this match */}
                {matchDetections.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-bold uppercase tracking-wider text-amber-400">Sharp Movements</span>
                      <span className="text-[10px] font-mono bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded border border-amber-800/30">
                        {matchDetections.length} DETECTED
                      </span>
                    </div>
                    {matchDetections.map(d => (
                      <div key={d.id} className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {d.direction === "SHORTENING"
                              ? <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                              : <TrendingUp className="h-3.5 w-3.5 text-red-400" />
                            }
                            <span className="text-xs font-mono font-bold text-foreground">
                              {d.market.replace(/_/g, " ")}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${d.direction === "SHORTENING" ? "text-emerald-400" : "text-red-400"}`}>
                              {d.direction}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{d.minute}'</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-muted-foreground">
                            {d.fromOdds.toFixed(2)} → {d.toOdds.toFixed(2)}
                            <span className="ml-2 text-amber-400 font-bold">Δ {(d.magnitude * 100).toFixed(1)}%</span>
                          </span>
                          <span className="text-foreground font-bold">{Math.round(d.confidence * 100)}% conf</span>
                        </div>
                        {d.onChainTxId && (
                          <a
                            href={`https://explorer.solana.com/tx/${d.onChainTxId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <Link2 className="h-3 w-3" /> ANCHORED ON-CHAIN
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Narrative + Events */}
              <div className="lg:col-span-1 space-y-4 flex flex-col">
                <div className="flex-1 min-h-[280px]">
                  <NarrativeFeed entries={narrative} />
                </div>
                <div className="flex-1 min-h-[220px]">
                  <MatchEventsLog events={events} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
