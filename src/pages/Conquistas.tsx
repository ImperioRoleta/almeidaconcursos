/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Clock, Flame, FileText, Award, CheckCircle, Lock, PenLine } from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  trophy: Trophy, target: Target, clock: Clock, flame: Flame,
  "file-text": FileText, award: Award, "check-circle": CheckCircle,
  "pen-line": PenLine,
};

const categoryLabels: Record<string, string> = {
  questoes: "🎯 Atirador — Questões",
  estudo: "📚 Quartel de Estudos",
  desempenho: "🏅 Operação Excelência",
  streak: "🔥 Força Operacional",
  simulados: "⚔️ Operações Simuladas",
  essays: "✍️ Redações",
  general: "🎖️ Geral",
};

const categoryColors: Record<string, string> = {
  questoes: "bg-primary/10 text-primary",
  estudo: "bg-accent/10 text-accent",
  desempenho: "bg-[hsl(152,69%,42%)]/10 text-[hsl(152,69%,42%)]",
  streak: "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]",
  simulados: "bg-[hsl(210,80%,55%)]/10 text-[hsl(210,80%,55%)]",
  essays: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)]",
  general: "bg-muted text-muted-foreground",
};

export default function Conquistas() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState({ questions: 0, hours: 0, accuracy: 0, streak: 0, simulations: 0, essays: 0, bestEssayScore: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [achRes, uaRes, sessRes, ansRes, simRes, essaysRes] = await Promise.all([
        supabase.from("achievements").select("*").order("category").order("threshold"),
        supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
        supabase.from("study_sessions").select("duration_seconds, started_at").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct, answered_at").eq("user_id", user.id),
        supabase.from("simulation_results").select("id").eq("user_id", user.id),
        supabase.from("essays").select("id, score").eq("user_id", user.id),
      ]);

      setAchievements(achRes.data ?? []);
      setUnlocked(new Set((uaRes.data ?? []).map((u: any) => u.achievement_id)));

      const sessions = sessRes.data ?? [];
      const answers = ansRes.data ?? [];
      const essays = essaysRes.data ?? [];
      const totalHours = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 3600;
      const correct = answers.filter(a => a.is_correct).length;
      const accuracy = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
      const bestEssayScore = essays.length > 0 ? Math.max(...essays.map(e => e.score || 0), 0) : 0;

      // Calculate streak
      const sessionDays = new Set(sessions.map(s => new Date(s.started_at).toDateString()));
      const answerDays = new Set(answers.map(a => new Date(a.answered_at).toDateString()));
      const allDays = new Set([...sessionDays, ...answerDays]);
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (allDays.has(d.toDateString())) streak++;
        else break;
      }

      setUserStats({
        questions: answers.length,
        hours: Math.round(totalHours * 10) / 10,
        accuracy,
        streak,
        simulations: simRes.data?.length ?? 0,
        essays: essays.length,
        bestEssayScore,
      });

      // Auto-unlock achievements
      const allAch = achRes.data ?? [];
      const currentUnlocked = new Set((uaRes.data ?? []).map((u: any) => u.achievement_id));
      for (const ach of allAch) {
        if (currentUnlocked.has(ach.id)) continue;
        let earned = false;
        if (ach.key.startsWith("questions_")) earned = answers.length >= ach.threshold;
        else if (ach.key.startsWith("hours_")) earned = totalHours >= ach.threshold;
        else if (ach.key.startsWith("accuracy_")) earned = accuracy >= ach.threshold && answers.length >= 10;
        else if (ach.key.startsWith("streak_")) earned = streak >= ach.threshold;
        else if (ach.key.startsWith("simulation_")) earned = (simRes.data?.length ?? 0) >= ach.threshold;
        else if (ach.key === "first_essay") earned = essays.length >= 1;
        else if (ach.key === "essay_5") earned = essays.length >= 5;
        else if (ach.key === "essay_10") earned = essays.length >= 10;
        else if (ach.key === "essay_score_800") earned = bestEssayScore >= 800;
        else if (ach.key === "essay_score_1000") earned = bestEssayScore >= 1000;

        if (earned) {
          const { error } = await supabase.from("user_achievements").insert({ user_id: user.id, achievement_id: ach.id });
          if (!error) {
            currentUnlocked.add(ach.id);
            toast.success(`🏆 Conquista desbloqueada: ${ach.name}!`);
          }
        }
      }
      setUnlocked(currentUnlocked);
    };
    fetchData();
  }, [user]);

  const getProgress = (ach: any) => {
    let current = 0;
    if (ach.key.startsWith("questions_")) current = userStats.questions;
    else if (ach.key.startsWith("hours_")) current = userStats.hours;
    else if (ach.key.startsWith("accuracy_")) current = userStats.accuracy;
    else if (ach.key.startsWith("streak_")) current = userStats.streak;
    else if (ach.key.startsWith("simulation_")) current = userStats.simulations;
    else if (ach.key === "first_essay") current = userStats.essays;
    else if (ach.key === "essay_5") current = userStats.essays;
    else if (ach.key === "essay_10") current = userStats.essays;
    else if (ach.key === "essay_score_800") current = userStats.bestEssayScore;
    else if (ach.key === "essay_score_1000") current = userStats.bestEssayScore;
    return Math.min((current / ach.threshold) * 100, 100);
  };

  const categories = [...new Set(achievements.map(a => a.category))];
  const unlockedCount = achievements.filter(a => unlocked.has(a.id)).length;
  const totalXp = achievements.filter(a => unlocked.has(a.id)).reduce((s, a) => s + a.xp_reward, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" /> Conquistas
          </h1>
          <p className="text-muted-foreground text-sm">
            {unlockedCount}/{achievements.length} desbloqueadas • {totalXp} XP acumulados
          </p>
        </div>
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Questões</p>
            <p className="font-mono font-bold text-primary">{userStats.questions}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Horas</p>
            <p className="font-mono font-bold text-accent">{userStats.hours}h</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Sequência</p>
            <p className="font-mono font-bold text-[hsl(25,95%,53%)]">{userStats.streak}🔥</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Redações</p>
            <p className="font-mono font-bold text-[hsl(280,70%,55%)]">{userStats.essays}✍️</p>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-mono font-semibold">{Math.round((unlockedCount / Math.max(achievements.length, 1)) * 100)}%</span>
          </div>
          <Progress value={(unlockedCount / Math.max(achievements.length, 1)) * 100} className="h-3" />
        </CardContent>
      </Card>

      {categories.map(cat => (
        <div key={cat} className="space-y-3">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Badge className={categoryColors[cat] || ""}>{categoryLabels[cat] || cat}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
            {achievements.filter(a => a.category === cat).map(ach => {
              const isUnlocked = unlocked.has(ach.id);
              const Icon = iconMap[ach.icon] || Trophy;
              const progress = getProgress(ach);
              return (
                <Card key={ach.id} className={`glass-card transition-all ${isUnlocked ? "border-accent/30 bg-accent/5" : "opacity-70"}`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isUnlocked ? "gradient-gold" : "bg-muted"}`}>
                      {isUnlocked ? <Icon className="w-6 h-6 text-background" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading font-semibold text-sm truncate">{ach.name}</h3>
                        <span className="text-xs font-mono text-accent shrink-0">+{ach.xp_reward} XP</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{ach.description}</p>
                      {!isUnlocked && (
                        <div className="pt-1">
                          <Progress value={progress} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{Math.round(progress)}%</p>
                        </div>
                      )}
                      {isUnlocked && (
                        <p className="text-[10px] text-accent flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Conquistado!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
