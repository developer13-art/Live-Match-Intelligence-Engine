import { NarrativeEntry } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface NarrativeFeedProps {
  entries: NarrativeEntry[];
}

export function NarrativeFeed({ entries }: NarrativeFeedProps) {
  const sortedEntries = [...entries].sort((a, b) => b.minute - a.minute);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STATE_CHANGE': return 'text-primary border-primary/20 bg-primary/5';
      case 'SIGNAL_FIRED': return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
      case 'RISK_ALERT': return 'text-destructive border-destructive/20 bg-destructive/5';
      case 'KEY_EVENT': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
      default: return 'text-muted-foreground border-border bg-muted/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50 rounded-lg overflow-hidden relative">
      <div className="p-3 border-b border-border/50 bg-card/50 flex justify-between items-center z-10 backdrop-blur">
        <h3 className="text-sm font-semibold tracking-tight uppercase">Live Narrative</h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">SYNCED</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {sortedEntries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className={`p-3 rounded-md border ${getTypeColor(entry.type)} relative overflow-hidden`}
              >
                {idx === 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-current" />
                )}
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-mono text-xs font-bold">{entry.minute}'</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-70 font-mono">
                    {entry.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm leading-snug">{entry.text}</p>
                <div className="mt-2 text-[10px] opacity-50 font-mono text-right">
                  {format(new Date(entry.timestamp), 'HH:mm:ss')}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
      
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}
