import { useStudyTimer } from "@/contexts/StudyTimerContext";
import { Timer, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function GlobalTimerBadge() {
  const { seconds, running, sessionId, pause, stop, formatTime } = useStudyTimer();

  if (!sessionId) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer">
          <span className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
          <Timer className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-sm font-bold text-primary tabular-nums">{formatTime(seconds)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 space-y-2" align="end">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Sessão Ativa</p>
        <p className="font-mono text-xl font-bold text-primary text-center tabular-nums">{formatTime(seconds)}</p>
        <div className="flex gap-2">
          <Button onClick={pause} size="sm" variant="outline" className="flex-1 gap-1 text-xs">
            {running ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Retomar</>}
          </Button>
          <Button onClick={stop} size="sm" variant="destructive" className="flex-1 gap-1 text-xs">
            <Square className="w-3 h-3" /> Parar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
