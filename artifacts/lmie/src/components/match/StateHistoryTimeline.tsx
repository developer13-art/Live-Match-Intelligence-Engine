import { StateHistoryEntry } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StateBadge } from "@/components/shared/StateBadge";

interface StateHistoryTimelineProps {
  history: StateHistoryEntry[];
}

export function StateHistoryTimeline({ history }: StateHistoryTimelineProps) {
  const sortedHistory = [...history].sort((a, b) => b.minute - a.minute);

  return (
    <div className="flex flex-col h-full bg-card/50 border border-border/50 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-card/50 flex justify-between items-center z-10 backdrop-blur">
        <h3 className="text-sm font-semibold tracking-tight uppercase">State History</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="relative">
          <div className="absolute left-8 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-6">
            {sortedHistory.map((entry, i) => (
              <div key={i} className="flex gap-4 items-center relative z-10">
                <div className="w-6 text-right font-mono text-xs font-bold text-muted-foreground">
                  {entry.minute}'
                </div>
                <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex-1">
                  <StateBadge state={entry.state} />
                  {entry.durationMinutes && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Maintained for {entry.durationMinutes} mins
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
