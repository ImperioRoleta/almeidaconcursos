import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Clock, Flame } from "lucide-react";

const DAILY_QUESTION_GOAL = 20;
const DAILY_HOURS_GOAL = 2;

function CircularProgress({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-lg font-heading font-bold font-mono"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {value}
          </motion.span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">/{max}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

export default function DailyGoalWidget() {
  const { user } = useAuth();
  const [questionsToday, setQuestionsToday] = useState(0);
  const [hoursToday, setHoursToday] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    Promise.all([
      supabase
        .from("user_answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("answered_at", todayISO),
      supabase
        .from("study_sessions")
        .select("duration_seconds, started_at")
        .eq("user_id", user.id),
    ]).then(([answersRes, sessionsRes]) => {
      setQuestionsToday(answersRes.count ?? 0);

      const sessions = sessionsRes.data ?? [];
      const todaySecs = sessions
        .filter((s) => new Date(s.started_at) >= today)
        .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      setHoursToday(Math.round((todaySecs / 3600) * 10) / 10);

      // Streak calc
      const sessionDays = new Set(sessions.map((s) => new Date(s.started_at).toDateString()));
      let s = 0;
      const now = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (sessionDays.has(d.toDateString())) s++;
        else break;
      }
      setStreak(s);
    });
  }, [user]);

  const questionsPct = Math.round((Math.min(questionsToday, DAILY_QUESTION_GOAL) / DAILY_QUESTION_GOAL) * 100);
  const hoursPct = Math.round((Math.min(hoursToday, DAILY_HOURS_GOAL) / DAILY_HOURS_GOAL) * 100);
  const overallPct = Math.round((questionsPct + hoursPct) / 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="glass-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="font-heading text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              Meta Diária
            </span>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[hsl(25,95%,53%)]" />
              <span className="text-sm font-mono font-bold">{streak}</span>
              <span className="text-[10px] text-muted-foreground">dias</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pb-5">
          <div className="flex items-center justify-around">
            <CircularProgress
              value={questionsToday}
              max={DAILY_QUESTION_GOAL}
              color="hsl(210, 100%, 52%)"
              label="Questões"
              sublabel="resolvidas hoje"
            />
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="text-3xl font-heading font-bold font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{
                  color:
                    overallPct >= 100
                      ? "hsl(152, 69%, 42%)"
                      : overallPct >= 50
                      ? "hsl(38, 92%, 50%)"
                      : "hsl(210, 100%, 52%)",
                }}
              >
                {overallPct}%
              </motion.div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {overallPct >= 100 ? "🎉 Meta batida!" : "progresso"}
              </p>
            </div>
            <CircularProgress
              value={hoursToday}
              max={DAILY_HOURS_GOAL}
              size={100}
              color="hsl(38, 92%, 50%)"
              label="Horas"
              sublabel="estudadas hoje"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
