import {
  useGetIntelligenceSummary, getGetIntelligenceSummaryQueryKey,
  useGetAgentStatus, getGetAgentStatusQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Activity, AlertTriangle, Radar, Zap, TrendingUp, Layers,
  Bot, Clock, CheckCircle, Wallet, ChevronRight
} from "lucide-react";

export default function IntelligenceSummary() {
  const { data: summary, isLoading, error } = useGetIntelligenceSummary({
    query: { queryKey: getGetIntelligenceSummaryQueryKey(), refetchInterval: 5000 }
  });
  const { data: agent } = useGetAgentStatus({
    query: { queryKey: getGetAgentStatusQueryKey(), refetchInterval: 10000 }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !summary) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-bold text-destructive">Failed to load intelligence summary</h2>
        </div>
      </AppLayout>
    );
  }

  const stats = [
    { label: "Live Matches",      value: summary.totalLiveMatches,        icon: Activity,     color: "text-blue-400",   bg: "bg-blue-950/30",   border: "border-blue-800/30" },
    { label: "High-Conf Signals", value: summary.highConfidenceSignals,   icon: Zap,          color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/20" },
    { label: "Sharp Movements",   value: summary.sharpMovements ?? 0,     icon: TrendingUp,   color: "text-amber-400",  bg: "bg-amber-950/30",  border: "border-amber-800/30" },
    { label: "On-Chain Anchors",  value: summary.anchorsOnChain ?? 0,     icon: Layers,       color: "text-cyan-400",   bg: "bg-cyan-950/30",   border: "border-cyan-800/30" },
    { label: "Avg Volatility",    value: Math.round(summary.avgVolatility), icon: Activity,   color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-800/30" },
    { label: "Market Inefficiencies", value: summary.marketInefficiencies, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-800/30" },
    { label: "Avg Market Lag",    value: summary.avgMarketLag !== undefined ? `${Math.round(summary.avgMarketLag)}` : "–", icon: Clock, color: "text-violet-400", bg: "bg-violet-950/30", border: "border-violet-800/30" },
    { label: "Agent Cycles",      value: summary.agentCycles ?? (agent?.cycleCount ?? 0), icon: Bot, color: "text-violet-400", bg: "bg-violet-950/30", border: "border-violet-800/30" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Intelligence Network</h1>
            <p className="text-muted-foreground text-xs font-mono mt-0.5">
              Global cross-match analysis across all monitored fixtures
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">
            <Radar className="h-4 w-4" />
            <span className="font-mono text-xs font-bold">MONITORING ACTIVE</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-lg border p-4 flex flex-col gap-3 ${bg} ${border}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className={`text-3xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active States Distribution */}
          <div className="bg-card/50 border border-border/50 rounded-lg p-5">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border/30">
              Active State Distribution
            </div>
            <div className="space-y-3">
              {summary.activeStates.map((state, i) => {
                const total = summary.activeStates.reduce((s, x) => s + x.count, 0) || 1;
                const pct = Math.round((state.count / total) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{state.state.replace(/_/g, " ")}</span>
                      <span className="font-bold text-foreground">{state.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Status Panel */}
          <div className="bg-card/50 border border-border/50 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Autonomous Agent
                </span>
              </div>
              {agent?.running && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                  </span>
                  RUNNING
                </span>
              )}
            </div>

            {agent ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold font-mono text-foreground tabular-nums">{agent.cycleCount}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">Cycles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">{agent.totalDetections}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">Detected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                      {Math.round((agent.accuracy ?? 0) * 100)}%
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">Accuracy</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                      <span>Correct</span>
                    </div>
                    <span className="font-bold text-green-400 tabular-nums">{agent.correctPredictions}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Anchors Submitted</span>
                    </div>
                    <span className="font-bold text-cyan-400 tabular-nums">{agent.anchorsSubmitted}</span>
                  </div>
                  {agent.walletAddress && (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5 text-violet-400" />
                        <span>Wallet</span>
                      </div>
                      <a
                        href={`https://explorer.solana.com/address/${agent.walletAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 font-mono"
                      >
                        {agent.walletAddress.slice(0, 8)}…{agent.walletAddress.slice(-6)}
                      </a>
                    </div>
                  )}
                </div>

                <Link href="/agent">
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-xs font-mono text-primary hover:text-primary/80 cursor-pointer transition-colors">
                    <span>View full agent panel</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm font-mono">Loading agent…</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
