interface StateBadgeProps {
  state: string;
  size?: "sm" | "md";
}

const STATE_CONFIG: Record<string, { label: string; className: string; pulse?: boolean }> = {
  DOMINANCE_HOME:     { label: "DOMINANCE HOME",  className: "bg-blue-900/50 text-blue-300 border-blue-700/50" },
  DOMINANCE_AWAY:     { label: "DOMINANCE AWAY",  className: "bg-violet-900/50 text-violet-300 border-violet-700/50" },
  PRESSURE_BUILD:     { label: "PRESSURE BUILD",  className: "bg-amber-900/50 text-amber-300 border-amber-700/50", pulse: true },
  TRANSITION_CHAOS:   { label: "CHAOS",           className: "bg-orange-900/60 text-orange-300 border-orange-700/60", pulse: true },
  DEFENSIVE_COLLAPSE: { label: "COLLAPSE",        className: "bg-red-900/60 text-red-300 border-red-700/60", pulse: true },
  STALEMATE:          { label: "STALEMATE",       className: "bg-slate-800/60 text-slate-400 border-slate-600/40" },
  GAME_LOCK:          { label: "GAME LOCK",       className: "bg-slate-800/80 text-slate-300 border-slate-600/60" },
  MOMENTUM_SHIFT:     { label: "MOMENTUM SHIFT",  className: "bg-cyan-900/50 text-cyan-300 border-cyan-700/50", pulse: true },
};

export function StateBadge({ state, size = "sm" }: StateBadgeProps) {
  const config = STATE_CONFIG[state] ?? { label: state.replace(/_/g, " "), className: "bg-secondary text-secondary-foreground border-border" };
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono font-semibold tracking-wider whitespace-nowrap ${sizeClass} ${config.className}`}
      data-testid={`badge-state-${state}`}
    >
      {config.pulse && (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {config.label}
    </span>
  );
}
