import { useState, useEffect } from "react";
import {
  useListMatches, getListMatchesQueryKey,
  useGetAgentStatus, getGetAgentStatusQueryKey,
  useGetIntelligenceSummary, getGetIntelligenceSummaryQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StateBadge } from "@/components/shared/StateBadge";
import { IndexBar } from "@/components/shared/IndexBar";
import { Link } from "wouter";
import { Activity, Bot, TrendingUp, Zap, ShieldAlert, Layers, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function AgentMiniCard() {
  const { data: agent } = useGetAgentStatus({
    query: { queryKey: getGetAgentStatusQueryKey(), refetchInterval: 10000 }
  });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!agent) return;
    setCountdown(Math.max(0, agent.nextCycleIn));
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [agent?.nextCycleIn]);

  return (
    <Link href="/agent">
      <div
        className="bg-card/60 border border-border/60 hover:border-primary/40 rounded-lg p-4 cursor-pointer transition-all group"
        data-testid="card-agent-mini"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono font-bold text-foreground tracking-wider">SHARP DETECTOR</span>
          </div>
          {agent?.running ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              RUNNING
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-secondary border border-border">IDLE</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-foreground tabular-nums">{agent?.cycleCount ?? "–"}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Cycles</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">{agent?.totalDetections ?? "–"}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Detected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {agent ? `${Math.round((agent.accuracy ?? 0) * 100)}%` : "–"}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Accuracy</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Next cycle in</span>
          <span className="text-xs font-mono font-bold text-primary tabular-nums">{countdown}s</span>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: matches, isLoading, error } = useListMatches({
    query: { queryKey: getListMatchesQueryKey(), refetchInterval: 5000 }
  });
  const { data: summary } = useGetIntelligenceSummary({
    query: { queryKey: getGetIntelligenceSummaryQueryKey(), refetchInterval: 5000 }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !matches) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-bold">Intelligence engine unavailable</h2>
          <p className="text-muted-foreground text-sm max-w-sm">Check backend connection or try again.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-mono font-bold text-primary text-xl tracking-tight">LMIE × TxLINE</span>
            </div>
            <p className="text-muted-foreground text-sm font-mono">
              World Cup 2026 · Real-Time Intelligence · Solana-Anchored
            </p>
          </div>
        </div>

        {/* Stat Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Live Matches",    value: matches.length,                         icon: Activity,    color: "text-blue-400" },
            { label: "High-Conf Signals", value: summary?.highConfidenceSignals ?? "–", icon: Zap,         color: "text-primary" },
            { label: "Sharp Movements", value: summary?.sharpMovements ?? "–",         icon: TrendingUp,  color: "text-amber-400" },
            { label: "On-Chain Anchors", value: summary?.anchorsOnChain ?? "–",        icon: Layers,      color: "text-cyan-400" },
            { label: "Agent Cycles",    value: summary?.agentCycles ?? "–",            icon: Bot,         color: "text-violet-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card/60 border border-border/50 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className={`text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Match Cards */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">
                Live Fixtures — {matches.length} active
              </h2>
            </div>

            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
                <Activity className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">No live matches — engine on standby.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {matches.map(match => (
                  <Link key={match.id} href={`/match/${match.id}`} data-testid={`card-match-${match.id}`}>
                    <div className="bg-card/60 border border-border/50 hover:border-primary/40 rounded-lg p-4 cursor-pointer transition-all group overflow-hidden relative">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Competition + minute */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {match.competition} · {match.group ?? ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-primary animate-pulse tabular-nums">
                            {match.minute}'{match.addedTime ? `+${match.addedTime}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Teams + Score */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{match.homeFlag}</span>
                            <span>{match.homeTeam}</span>
                          </span>
                          <span className="font-mono text-lg tabular-nums">{match.homeScore}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{match.awayFlag}</span>
                            <span>{match.awayTeam}</span>
                          </span>
                          <span className="font-mono text-lg tabular-nums text-foreground">{match.awayScore}</span>
                        </div>
                      </div>

                      {/* State Badge */}
                      <div className="flex items-center justify-between">
                        <StateBadge state={match.matchState} />
                        <span className="text-[10px] font-mono text-muted-foreground/50">{match.venue}</span>
                      </div>

                      {/* Mini Index Bars — use static 50 placeholder since list endpoint doesn't include indices */}
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                        <IndexBar label="Momentum" value={50} color="primary" showValue={false} />
                        <IndexBar label="Pressure" value={50} color="amber" showValue={false} />
                        <IndexBar label="Volatility" value={50} color="red" showValue={false} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider">Agent Status</h2>
            <AgentMiniCard />
            {summary && (
              <div className="bg-card/60 border border-border/50 rounded-lg p-4 space-y-3">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/30">
                  Active States
                </div>
                {summary.activeStates.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">{s.state.replace(/_/g, " ")}</span>
                    <span className="text-xs font-mono font-bold text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
