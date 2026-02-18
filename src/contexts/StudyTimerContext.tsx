/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type TimerState = {
  seconds: number;
  running: boolean;
  sessionId: string | null;
  selectedSubject: string;
  subjects: any[];
  setSelectedSubject: (s: string) => void;
  start: () => Promise<void>;
  pause: () => void;
  stop: () => Promise<void>;
  formatTime: (s: number) => string;
};

const StudyTimerContext = createContext<TimerState>({} as TimerState);

export const useStudyTimer = () => useContext(StudyTimerContext);

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
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

  const formatTime = useCallback((s: number) =>
    `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`, []);

  const start = useCallback(async () => {
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
  }, [user, selectedSubject]);

  const pause = useCallback(() => setRunning(r => !r), []);

  const stop = useCallback(async () => {
    if (!sessionId) return;
    setRunning(false);
    const finalSeconds = seconds;
    await supabase.from("study_sessions").update({
      ended_at: new Date().toISOString(),
      duration_seconds: finalSeconds,
    }).eq("id", sessionId);
    toast.success(`Sessão finalizada! ${formatTime(finalSeconds)} de estudo.`);
    setSessionId(null);
    setSeconds(0);
  }, [sessionId, seconds, formatTime]);

  return (
    <StudyTimerContext.Provider value={{ seconds, running, sessionId, selectedSubject, subjects, setSelectedSubject, start, pause, stop, formatTime }}>
      {children}
    </StudyTimerContext.Provider>
  );
}
