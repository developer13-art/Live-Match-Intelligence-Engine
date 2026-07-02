import { MatchEvent, MatchEventType } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Circle, Flag, Square, ArrowRightLeft, Target, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface MatchEventsLogProps {
  events: MatchEvent[];
}

export function MatchEventsLog({ events }: MatchEventsLogProps) {
  const getEventIcon = (type: MatchEventType) => {
    switch (type) {
      case 'GOAL': return <Circle className="h-4 w-4 text-emerald-500 fill-emerald-500" />;
      case 'YELLOW_CARD': return <Square className="h-4 w-4 text-amber-500 fill-amber-500" />;
      case 'RED_CARD': return <Square className="h-4 w-4 text-destructive fill-destructive" />;
      case 'SUBSTITUTION': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case 'SHOT_ON_TARGET': return <Target className="h-4 w-4 text-primary" />;
      case 'SHOT_OFF_TARGET': return <Target className="h-4 w-4 text-muted-foreground" />;
      case 'CORNER': return <Flag className="h-4 w-4 text-primary" />;
      case 'FOUL': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'VAR_CHECK': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'OFFSIDE': return <Flag className="h-4 w-4 text-orange-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const sortedEvents = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="flex flex-col h-full bg-card/50 border border-border/50 rounded-lg overflow-hidden relative">
      <div className="p-3 border-b border-border/50 bg-card/50 flex justify-between items-center z-10 backdrop-blur">
        <h3 className="text-sm font-semibold tracking-tight uppercase">Event Log</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {sortedEvents.map((event) => (
            <div key={event.id} className="flex gap-4 items-start relative pb-4 last:pb-0">
              <div className="w-8 text-right font-mono text-xs font-bold pt-0.5">
                {event.minute}'
              </div>
              <div className="relative z-10 bg-background rounded-full p-0.5 ring-2 ring-background mt-0.5">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${event.team === 'HOME' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {event.team}
                  </span>
                  <span className="text-sm font-medium">{event.player || 'Team Event'}</span>
                </div>
                <p className="text-xs text-muted-foreground">{event.description}</p>
              </div>
            </div>
          ))}
          {sortedEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No significant events recorded yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
