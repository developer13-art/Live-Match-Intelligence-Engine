import { useState, useEffect } from "react";
import {
  useGetAgentStatus, getGetAgentStatusQueryKey,
  useListDetections, getListDetectionsQueryKey,
  useListAnchors, getListAnchorsQueryKey,
  useGetAgentWallet, getGetAgentWalletQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, CheckCircle, XCircle, Clock, Wallet, Link2,
  TrendingUp, TrendingDown, Layers, Activity, Zap, Radio,
} from "lucide-react";
import { format } from "date-fns";

function OutcomeBadge({ outcome }: { outcome: string }) {
  switch (outcome) {
    case "CORRECT":   return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">CORRECT</span>;
    case "INCORRECT": return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700">INCORRECT</span>;
    case "EXPIRED":   return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-600">EXPIRED</span>;
    default:          return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700 animate-pulse">PENDING</span>;
  }
}

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "SHORTENING") {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-400">
        <TrendingUp className="h-3 w-3" /> SHORT
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-red-400">
      <TrendingDown className="h-3 w-3" /> DRIFT
    </span>
  );
}

export default function AgentPage() {
  const { data: agent, isLoading: agentLoading } = useGetAgentStatus({
    query: { queryKey: getGetAgentStatusQueryKey(), refetchInterval: 10000 }
  });
  const { data: detections } = useListDetections({
    query: { queryKey: getListDetectionsQueryKey(), refetchInterval: 10000 }
  });
  const { data: anchors } = useListAnchors({
    query: { queryKey: getListAnchorsQueryKey(), refetchInterval: 10000 }
  });
  const { data: wallet } = useGetAgentWallet({
    query: { queryKey: getGetAgentWalletQueryKey(), refetchInterval: 30000 }
  });

  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (!agent) return;
    setCountdown(Math.max(0, agent.nextCycleIn));
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [agent?.nextCycleIn]);

  if (agentLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  const correctPct = agent ? Math.round((agent.accuracy ?? 0) * 100) : 0;
  const pendingCount = agent?.pendingPredictions ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txlineReal = (agent as any)?.txlineRealApi === true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletData = wallet as any;
  const hasUserWallet = walletData?.address && walletData?.signerAddress && walletData.address !== walletData.signerAddress;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="relative overflow-hidden rounded-xl border border-violet-700/30 bg-gradient-to-br from-violet-950/40 via-card to-card p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-1">
                <Bot className="h-5 w-5 text-violet-400" />
                <span className="font-mono font-bold text-xl text-foreground tracking-tight">Sharp Movement Detector</span>
                {agent?.running ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 bg-green-950/50 border border-green-800/40 px-2 py-0.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                    AUTONOMOUS · RUNNING
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-border">IDLE</span>
                )}
              </div>
              <p className="text-muted-foreground text-xs font-mono">
                60-second autonomous cycle · Solana devnet anchoring
              </p>
              {/* Data source badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {txlineReal ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    TxLINE LIVE API
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full bg-blue-950/60 border border-blue-700/50 text-blue-300">
                    <Zap className="h-2.5 w-2.5" />
                    TxLINE SIMULATION
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1 rounded-full bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">
                  <Layers className="h-2.5 w-2.5" />
                  SOLANA DEVNET
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Next cycle in</div>
              <div className="font-mono text-3xl font-bold text-primary tabular-nums">{countdown}s</div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Agent Cycles",  value: agent?.cycleCount ?? 0,         color: "text-blue-400" },
            { label: "Detections",    value: agent?.totalDetections ?? 0,     color: "text-amber-400" },
            { label: "Accuracy",      value: `${correctPct}%`,                color: "text-emerald-400" },
            { label: "Anchors",       value: agent?.anchorsSubmitted ?? 0,    color: "text-cyan-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card/60 border border-border/50 rounded-lg p-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
              <div className={`text-3xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Prediction Breakdown + Wallet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-3">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30">
              Prediction Outcomes
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Correct",   value: agent?.correctPredictions ?? 0,         icon: CheckCircle, color: "text-emerald-400" },
                { label: "Pending",   value: pendingCount,                            icon: Clock,       color: "text-amber-400" },
                { label: "Incorrect", value: (agent?.totalDetections ?? 0) - (agent?.correctPredictions ?? 0) - pendingCount, icon: XCircle, color: "text-red-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-xs font-mono ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className={`text-sm font-bold font-mono tabular-nums ${color}`}>{Math.max(0, value)}</span>
                </div>
              ))}
            </div>
            {agent?.thresholds && (
              <div className="pt-3 border-t border-border/30 space-y-1.5">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Thresholds</div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Min Movement</span>
                  <span className="text-foreground">{Math.round(agent.thresholds.minMovementPct * 100)}%</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Min Confidence</span>
                  <span className="text-foreground">{Math.round(agent.thresholds.minConfidence * 100)}%</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Anchor Confidence</span>
                  <span className="text-cyan-400">{Math.round(agent.thresholds.anchorMinConfidence * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Panel */}
          <div className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-3">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30">
              Solana Devnet Wallet
            </div>
            {walletData ? (
              <div className="space-y-3">
                {/* User's wallet (display wallet) */}
                <div className="flex items-start gap-2 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg">
                  <Wallet className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">
                      {hasUserWallet ? "Your Wallet" : "Agent Wallet"}
                    </div>
                    <div className="text-xs font-mono text-cyan-300 break-all">{walletData.address}</div>
                  </div>
                </div>

                {/* Signing keypair — only show when it differs from display wallet */}
                {hasUserWallet && (
                  <div className="flex items-start gap-2 p-3 bg-violet-950/20 border border-violet-800/30 rounded-lg">
                    <Bot className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-muted-foreground mb-0.5">Agent Signing Keypair</div>
                      <div className="text-xs font-mono text-violet-300 break-all">{walletData.signerAddress}</div>
                      <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                        Fund this address to enable on-chain anchoring
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/30 rounded p-2">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">Network</div>
                    <div className="text-xs font-mono text-cyan-400 font-bold uppercase">{walletData.network}</div>
                  </div>
                  <div className="bg-secondary/30 rounded p-2">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">
                      {hasUserWallet ? "Your Balance" : "Balance"}
                    </div>
                    <div className="text-xs font-mono text-foreground font-bold tabular-nums">
                      {walletData.balance !== null ? `${walletData.balance} SOL` : "—"}
                    </div>
                  </div>
                  {hasUserWallet && (
                    <>
                      <div className="col-span-2 bg-secondary/30 rounded p-2">
                        <div className="text-[10px] font-mono text-muted-foreground mb-0.5">Signer Balance</div>
                        <div className="text-xs font-mono text-violet-300 font-bold tabular-nums">{walletData.signerBalance} SOL</div>
                      </div>
                    </>
                  )}
                </div>

                {walletData.airdropAvailable && (
                  <div className="text-[10px] font-mono text-amber-400/70">
                    ⚠ Devnet airdrop may be rate-limited. Fund the signer keypair manually to enable anchoring.
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <a
                    href={walletData.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                    {hasUserWallet ? "Your wallet on Explorer" : "View on Solana Explorer"}
                  </a>
                  {hasUserWallet && walletData.signerExplorerUrl && (
                    <a
                      href={walletData.signerExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      Signer keypair on Explorer
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg">
                  <Wallet className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-muted-foreground">Address</div>
                    <div className="text-xs font-mono text-cyan-300 truncate">
                      {(agent as any)?.walletAddress ?? "Loading…"}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-amber-400/70">
                  ⚠ Devnet airdrop rate-limited. Anchoring paused until funded.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detections Log */}
        <div className="bg-card/50 border border-border/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-mono font-bold uppercase tracking-wider">Detection Log</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {detections?.length ?? 0} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/20">
                  {["Match", "Min", "Market", "Direction", "From→To", "Magnitude", "Confidence", "Outcome", "On-Chain"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(detections ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No sharp movements detected yet. Agent will detect on next cycle.
                    </td>
                  </tr>
                ) : (
                  (detections ?? []).map(d => (
                    <tr key={d.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-foreground">{d.homeTeam} vs {d.awayTeam}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{d.minute}'</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{d.market.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <DirectionBadge direction={d.direction} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {d.fromOdds.toFixed(2)} → {d.toOdds.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-amber-400 font-bold">{(d.magnitude * 100).toFixed(1)}%</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={d.confidence >= 0.8 ? "text-emerald-400" : "text-amber-400"}>
                          {Math.round(d.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <OutcomeBadge outcome={d.outcome} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {d.onChainTxId ? (
                          <a
                            href={`https://explorer.solana.com/tx/${d.onChainTxId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <Link2 className="h-3 w-3" />
                            <span className="text-[10px]">{d.onChainTxId.slice(0, 8)}…</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* On-Chain Anchors */}
        <div className="bg-card/50 border border-border/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-mono font-bold uppercase tracking-wider">On-Chain Anchors</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {anchors?.length ?? 0} anchored
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/20">
                  {["Tx Signature", "Signal Type", "Match", "Network", "Timestamp", "Explorer"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(anchors ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No on-chain anchors yet. High-confidence signals will be anchored automatically.
                    </td>
                  </tr>
                ) : (
                  (anchors ?? []).map(a => (
                    <tr key={a.id} className="border-b border-border/20 hover:bg-cyan-950/10 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-cyan-300 font-mono">
                        {a.txSignature.slice(0, 12)}…{a.txSignature.slice(-6)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {a.signalType.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {a.matchId.slice(0, 10)}…
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-cyan-400 uppercase">{a.network}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {format(new Date(a.anchoredAt), "HH:mm:ss")}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <a
                          href={a.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <Link2 className="h-3 w-3" />
                          <span>View</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
