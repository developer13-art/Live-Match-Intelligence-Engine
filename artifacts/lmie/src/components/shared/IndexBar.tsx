import { motion } from "framer-motion";

interface IndexBarProps {
  label: string;
  value: number;
  color?: "primary" | "amber" | "red" | "cyan" | "violet" | "emerald";
  showValue?: boolean;
  thick?: boolean;
}

const colorMap = {
  primary: { bar: "bg-blue-500", track: "bg-blue-950/60", text: "text-blue-400" },
  amber:   { bar: "bg-amber-500", track: "bg-amber-950/60", text: "text-amber-400" },
  red:     { bar: "bg-red-500", track: "bg-red-950/60", text: "text-red-400" },
  cyan:    { bar: "bg-cyan-500", track: "bg-cyan-950/60", text: "text-cyan-400" },
  violet:  { bar: "bg-violet-500", track: "bg-violet-950/60", text: "text-violet-400" },
  emerald: { bar: "bg-emerald-500", track: "bg-emerald-950/60", text: "text-emerald-400" },
};

export function IndexBar({ label, value, color = "primary", showValue = true, thick = false }: IndexBarProps) {
  const c = colorMap[color];
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
        {showValue && (
          <span className={`text-xs font-mono font-bold tabular-nums ${c.text}`}>
            {Math.round(clamped)}
          </span>
        )}
      </div>
      <div className={`w-full overflow-hidden rounded-full ${c.track} ${thick ? "h-2.5" : "h-1.5"}`}>
        <motion.div
          className={`h-full rounded-full ${c.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", bounce: 0, duration: 0.8 }}
        />
      </div>
    </div>
  );
}
