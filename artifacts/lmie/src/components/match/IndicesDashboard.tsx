import { MatchIndices } from "@workspace/api-client-react";
import { IndexBar } from "@/components/shared/IndexBar";

interface IndicesDashboardProps {
  indices: MatchIndices;
}

export function IndicesDashboard({ indices }: IndicesDashboardProps) {
  return (
    <div className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-4">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/30">
        System Indices
      </div>
      <IndexBar label="Momentum" value={indices.momentum} color="primary" thick />
      <IndexBar label="Pressure" value={indices.pressure} color="amber" thick />
      <IndexBar label="Volatility" value={indices.volatility} color="red" thick />
      <IndexBar label="Market Lag" value={indices.marketLag} color="cyan" thick />

      <div className="pt-3 border-t border-border/30 space-y-2">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Dominance Split</div>
        <div className="flex h-2.5 w-full rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${indices.dominanceHome}%` }} />
          <div className="bg-violet-500 h-full transition-all duration-700 flex-1" />
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-blue-400 font-bold">{Math.round(indices.dominanceHome)}% HOME</span>
          <span className="text-violet-400 font-bold">{Math.round(indices.dominanceAway)}% AWAY</span>
        </div>
      </div>
    </div>
  );
}
