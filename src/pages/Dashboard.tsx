import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, BookOpen, Award, TrendingUp, BarChart3, Flame, Trophy, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StudyTimer } from "@/components/StudyTimer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import UpgradePrompt from "@/components/UpgradePrompt";
import DailyGoalWidget from "@/components/DailyGoalWidget";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.25 } },
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ hours: 0, accuracy: 0, lessonsCompleted: 0, questionsAnswered: 0, streak: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [achievementStats, setAchievementStats] = useState({ total: 0, unlocked: 0 });
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);

  // Redirect new users to diagnostic
  useEffect(() => {
    if (!user) return;
    const checkDiagnostic = async () => {
      const { data } = await supabase
        .from("diagnostic_results")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!data || data.length === 0) {
        navigate("/diagnostico", { replace: true });
      }
    };
    checkDiagnostic();
  }, [user, navigate]);

  // Auto-promote level
  useEffect(() => {
    if (!user || !profile) return;
    const checkPromotion = async () => {
      const [levelsRes, sessionsRes, answersRes] = await Promise.all([
        supabase.from("levels").select("*").order("rank_order"),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct").eq("user_id", user.id),
      ]);
      const allLevels = levelsRes.data ?? [];
      const totalHours = (sessionsRes.data ?? []).reduce((s, r) => s + (r.duration_seconds || 0), 0) / 3600;
      const answers = answersRes.data ?? [];
      const accuracy = answers.length > 0 ? (answers.filter(a => a.is_correct).length / answers.length) * 100 : 0;
      const currentOrder = profile.levels?.rank_order || 1;

      // Find highest eligible level
      let bestLevel = currentOrder;
      for (const lv of allLevels) {
        if (lv.rank_order > currentOrder && totalHours >= (lv.min_hours || 0) && accuracy >= (lv.min_accuracy || 0)) {
          bestLevel = Math.max(bestLevel, lv.rank_order);
        }
      }
      if (bestLevel > currentOrder) {
        const newLevel = allLevels.find(l => l.rank_order === bestLevel);
        if (newLevel) {
          await supabase.from("profiles").update({ level_id: newLevel.id }).eq("user_id", user.id);
          toast.success(`🎖️ Parabéns! Você foi promovido a ${newLevel.name}!`, { duration: 5000 });
        }
      }
    };
    checkPromotion();
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sessionsRes, answersRes, progressRes, subjectsRes, subRes, achRes, uaRes] = await Promise.all([
        supabase.from("study_sessions").select("duration_seconds, started_at").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct, question_id, answered_at").eq("user_id", user.id),
        supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("subjects").select("id, name"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase.from("achievements").select("id", { count: "exact", head: true }),
        supabase.from("user_achievements").select("*, achievements(name, icon)").eq("user_id", user.id).order("unlocked_at", { ascending: false }).limit(3),
      ]);

      setSubscription(subRes.data);
      setAchievementStats({ total: achRes.count ?? 0, unlocked: uaRes.data?.length ?? 0 });
      setRecentAchievements(uaRes.data ?? []);

      const sessions = sessionsRes.data ?? [];
      const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const answers = answersRes.data ?? [];
      const correct = answers.filter(a => a.is_correct).length;

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

      setStats({
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
        lessonsCompleted: progressRes.data?.length ?? 0,
        questionsAnswered: answers.length,
        streak,
      });

      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const weekData = days.map(() => 0);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sessions.filter(s => new Date(s.started_at) >= weekAgo).forEach(s => {
        const day = new Date(s.started_at).getDay();
        weekData[day] += (s.duration_seconds || 0) / 3600;
      });
      setWeeklyData(days.map((day, i) => ({ day, horas: Math.round(weekData[i] * 10) / 10 })));

      const subjectMap: Record<string, { name: string; correct: number; total: number }> = {};
      const subjectsList = subjectsRes.data ?? [];
      const questionIds = [...new Set(answers.map(a => a.question_id))];
      if (questionIds.length > 0) {
        const { data: qs } = await supabase.from("questions").select("id, subject_id").in("id", questionIds);
        const qMap: Record<string, string> = {};
        qs?.forEach(q => { qMap[q.id] = q.subject_id; });
        answers.forEach(a => {
          const sid = qMap[a.question_id];
          if (!sid) return;
          const sub = subjectsList.find(s => s.id === sid);
          if (!sub) return;
          if (!subjectMap[sid]) subjectMap[sid] = { name: sub.name, correct: 0, total: 0 };
          subjectMap[sid].total++;
          if (a.is_correct) subjectMap[sid].correct++;
        });
      }
      setSubjectStats(Object.values(subjectMap).map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
        acerto: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      })));
    };
    fetchStats();
  }, [user]);

  const levelName = profile?.levels?.name || "Recruta";
  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const COLORS = ["hsl(210, 100%, 52%)", "hsl(220, 14%, 14%)"];
  const pieData = [
    { name: "Acertos", value: stats.accuracy || 1 },
    { name: "Erros", value: (100 - stats.accuracy) || 1 },
  ];

  const cards = [
    { label: "Horas de Estudo", value: `${stats.hours}h`, icon: Clock, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, gradient: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { label: "Aulas Concluídas", value: stats.lessonsCompleted, icon: BookOpen, gradient: "from-[hsl(210,80%,55%)]/20 to-[hsl(210,80%,55%)]/5", iconColor: "text-[hsl(210,80%,55%)]" },
    { label: "Questões", value: stats.questionsAnswered, icon: BarChart3, gradient: "from-[hsl(142,71%,45%)]/20 to-[hsl(142,71%,45%)]/5", iconColor: "text-[hsl(142,71%,45%)]" },
    { label: "Sequência", value: `${stats.streak} 🔥`, icon: Flame, gradient: "from-[hsl(25,95%,53%)]/20 to-[hsl(25,95%,53%)]/5", iconColor: "text-[hsl(25,95%,53%)]" },
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Welcome header */}
      <motion.div variants={item} className="flex items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Olá, {profile?.name || "Aluno"} 👋</h1>
          <p className="text-muted-foreground">
            Continue evoluindo • <span className="text-accent font-semibold">{levelName}</span>
          </p>
        </div>
      </motion.div>

      {/* Subscription warning */}
      {isExpired && (
        <motion.div variants={item}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold text-sm text-destructive">Sua assinatura expirou</p>
                <p className="text-xs text-muted-foreground">Renove para continuar acessando o conteúdo premium.</p>
              </div>
              <Link to="/assinatura">
                <Button size="sm" variant="outline" className="border-destructive/30 text-destructive">Renovar</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <StudyTimer />
      </motion.div>

      {/* Premium upgrade banner */}
      <motion.div variants={item}>
        <UpgradePrompt context="Estude sem limites: questões, simulados, IA e plano personalizado" />
      </motion.div>

      {/* Daily Goal Widget */}
      <DailyGoalWidget />

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {cards.map((c, i) => (
          <motion.div key={i} variants={item} whileHover="hover" initial="rest" animate="rest">
            <motion.div variants={cardHover}>
              <Card className="stat-card">
                <CardContent className="p-3 md:p-4">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-2 md:mb-3`}>
                    <c.icon className={`w-4 h-4 md:w-5 md:h-5 ${c.iconColor}`} />
                  </div>
                  <p className="text-[9px] md:text-[11px] text-muted-foreground uppercase tracking-wider font-medium leading-tight">{c.label}</p>
                  <p className="text-lg md:text-2xl font-heading font-bold font-mono mt-0.5">{c.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick actions + Achievements */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick actions */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: "Questões", url: "/questoes", icon: Target },
              { label: "Simulado", url: "/simulados", icon: BarChart3 },
              { label: "Aulas", url: "/aulas", icon: BookOpen },
              { label: "Ranking", url: "/ranking", icon: Trophy },
            ].map((navItem, i) => (
              <Link key={i} to={navItem.url}>
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <navItem.icon className="w-4 h-4 text-primary" /> {navItem.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Achievements summary */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /> Conquistas</span>
              <Link to="/conquistas" className="text-xs text-primary hover:underline">Ver todas →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-mono">{achievementStats.unlocked}/{achievementStats.total}</span>
            </div>
            <Progress value={(achievementStats.unlocked / Math.max(achievementStats.total, 1)) * 100} className="h-2" />
            {recentAchievements.length > 0 && (
              <div className="space-y-1">
                {recentAchievements.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="w-3 h-3 text-accent" />
                    <span>{(a as any).achievements?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              Estudo Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                <Bar dataKey="horas" fill="hsl(210, 100%, 52%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-accent" />
              </div>
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center relative pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={82} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold font-mono text-primary">{stats.accuracy}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">acerto</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject Performance */}
      {subjectStats.length > 0 && (
        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-accent" />
                </div>
                Desempenho por Matéria
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectStats} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                  <Bar dataKey="acerto" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
