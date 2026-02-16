import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, BookOpen, Award, TrendingUp, BarChart3, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StudyTimer } from "@/components/StudyTimer";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ hours: 0, accuracy: 0, lessonsCompleted: 0, questionsAnswered: 0, streak: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sessionsRes, answersRes, progressRes, subjectsRes] = await Promise.all([
        supabase.from("study_sessions").select("duration_seconds, started_at").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct, question_id, answered_at").eq("user_id", user.id),
        supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("subjects").select("id, name"),
      ]);

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
      const subjects = subjectsRes.data ?? [];
      const questionIds = [...new Set(answers.map(a => a.question_id))];
      if (questionIds.length > 0) {
        const { data: qs } = await supabase.from("questions").select("id, subject_id").in("id", questionIds);
        const qMap: Record<string, string> = {};
        qs?.forEach(q => { qMap[q.id] = q.subject_id; });
        answers.forEach(a => {
          const sid = qMap[a.question_id];
          if (!sid) return;
          const sub = subjects.find(s => s.id === sid);
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
  const COLORS = ["hsl(217, 99%, 50%)", "hsl(0, 0%, 15%)"];

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
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            Olá, {profile?.name || "Aluno"} 👋
          </h1>
          <p className="text-muted-foreground">
            Continue evoluindo • <span className="text-accent font-semibold">{levelName}</span>
          </p>
        </div>
      </div>

      <StudyTimer />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger-children">
        {cards.map((c, i) => (
          <Card key={i} className="stat-card">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-3`}>
                <c.icon className={`w-5 h-5 ${c.iconColor}`} />
              </div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{c.label}</p>
              <p className="text-2xl font-heading font-bold font-mono mt-0.5">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <XAxis dataKey="day" stroke="hsl(0, 0%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(0, 0%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 7%)",
                    border: "1px solid hsl(0, 0%, 15%)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="horas" fill="hsl(217, 99%, 50%)" radius={[6, 6, 0, 0]} />
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
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold font-mono text-primary">{stats.accuracy}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">acerto</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      {subjectStats.length > 0 && (
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
                <XAxis type="number" domain={[0, 100]} stroke="hsl(0, 0%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(0, 0%, 40%)" fontSize={11} width={100} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 7%)",
                    border: "1px solid hsl(0, 0%, 15%)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="acerto" fill="hsl(43, 76%, 53%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
