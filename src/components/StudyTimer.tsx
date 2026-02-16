import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Play, Pause, Square, Timer } from "lucide-react";

export function StudyTimer() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("id, name").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const start = async () => {
    if (!user) return;
    const { data } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      subject_id: selectedSubject || null,
    }).select().single();
    if (data) {
      setSessionId(data.id);
      setSeconds(0);
      setRunning(true);
      toast.success("Sessão de estudo iniciada!");
    }
  };

  const pause = () => setRunning(!running);

  const stop = async () => {
    if (!sessionId) return;
    setRunning(false);
    await supabase.from("study_sessions").update({
      ended_at: new Date().toISOString(),
      duration_seconds: seconds,
    }).eq("id", sessionId);
    toast.success(`Sessão finalizada! ${formatTime(seconds)} de estudo.`);
    setSessionId(null);
    setSeconds(0);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Card className="glass-card border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <span className="font-mono text-2xl font-bold text-primary">{formatTime(seconds)}</span>
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

          <div className="flex gap-2">
            {!sessionId ? (
              <Button onClick={start} size="sm" className="gradient-primary text-primary-foreground gap-1">
                <Play className="w-4 h-4" /> Iniciar
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
