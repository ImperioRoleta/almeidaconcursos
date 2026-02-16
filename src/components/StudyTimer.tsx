import { useStudyTimer } from "@/contexts/StudyTimerContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, Timer, Zap } from "lucide-react";

export function StudyTimer() {
  const { seconds, running, sessionId, selectedSubject, subjects, setSelectedSubject, start, pause, stop, formatTime } = useStudyTimer();

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      <CardContent className="p-4 relative">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cronômetro</p>
              <span className="font-mono text-2xl font-bold text-primary tabular-nums">{formatTime(seconds)}</span>
            </div>
          </div>

          {!sessionId && (
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Matéria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2 ml-auto">
            {!sessionId ? (
              <Button onClick={start} size="sm" className="gradient-primary text-primary-foreground gap-1.5 shadow-lg shadow-primary/25">
                <Zap className="w-4 h-4" /> Iniciar Sessão
              </Button>
            ) : (
              <>
                <Button onClick={pause} size="sm" variant="outline" className="gap-1">
                  {running ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Retomar</>}
                </Button>
                <Button onClick={stop} size="sm" variant="destructive" className="gap-1">
                  <Square className="w-4 h-4" /> Parar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
