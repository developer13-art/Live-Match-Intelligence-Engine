import { Signal, SignalStrength } from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, AlertCircle, Link2 } from "lucide-react";

interface SignalCardProps {
  signal: Signal;
}

function getStrengthStyle(strength: SignalStrength) {
  switch (strength) {
    case "CRITICAL": return "bg-red-900/60 text-red-300 border-red-700 animate-pulse";
    case "HIGH":     return "bg-orange-900/50 text-orange-300 border-orange-700";
    case "MEDIUM":   return "bg-amber-900/50 text-amber-300 border-amber-700";
    case "LOW":      return "bg-slate-800 text-slate-300 border-slate-600";
    default:         return "bg-secondary text-secondary-foreground border-border";
  }
}

function getConfidenceColor(c: number) {
  if (c >= 0.8) return "text-emerald-400";
  if (c >= 0.6) return "text-amber-400";
  return "text-slate-400";
}

function getIcon(type: string) {
  if (type.includes("SPIKE") || type.includes("BUILDUP") || type.includes("MOMENTUM")) return TrendingUp;
  if (type.includes("COLLAPSE") || type.includes("STRESS")) return TrendingDown;
  if (type.includes("RISK") || type.includes("WARNING")) return AlertTriangle;
  return Activity;
}

export function SignalCard({ signal }: SignalCardProps) {
  const Icon = getIcon(signal.type);
  const confidencePct = Math.round(signal.confidence * 100);
  const isAnchored = !!signal.onChainTxId;

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${signal.strength === "CRITICAL" ? "border-red-700/50 bg-red-950/20" : "border-border/50 bg-card/40"}`}
      data-testid={`card-signal-${signal.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="font-semibold text-sm text-foreground leading-tight">{signal.headline}</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
              {signal.type.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStrengthStyle(signal.strength)}`}>
            {signal.strength}
          </span>
          <span className={`text-xl font-bold font-mono tabular-nums ${getConfidenceColor(signal.confidence)}`}>
            {confidencePct}%
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{signal.reasoning}</p>

      {signal.factors && signal.factors.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Factors</div>
          <div className="flex flex-wrap gap-1">
            {signal.factors.map((f, i) => (
              <span key={i} className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded font-mono">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {signal.riskWarnings && signal.riskWarnings.filter(Boolean).length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded p-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 uppercase tracking-wider">
            <AlertCircle className="h-3 w-3" />
            Risk Warnings
          </div>
          {signal.riskWarnings.filter(Boolean).map((w, i) => (
            <div key={i} className="text-[10px] text-amber-400/70 font-mono pl-4">– {w}</div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[10px] font-mono text-muted-foreground">
          {signal.relevanceWindowMinutes}min window
        </span>
        {isAnchored ? (
          <a
            href={`https://explorer.solana.com/tx/${signal.onChainTxId}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid={`link-anchor-signal-${signal.id}`}
          >
            <Link2 className="h-3 w-3" />
            ANCHORED ON-CHAIN
          </a>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground/40">unanchored</span>
        )}
      </div>
    </div>
  );
}
