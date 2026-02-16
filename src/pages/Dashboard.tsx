import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, BookOpen, Award, TrendingUp, BarChart3, Flame, Calendar } from "lucide-react";
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

      setStats({
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
        lessonsCompleted: progressRes.data?.length ?? 0,
        questionsAnswered: answers.length,
        streak,
      });

      // Weekly data from real sessions
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const weekData = days.map(() => 0);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sessions.filter(s => new Date(s.started_at) >= weekAgo).forEach(s => {
        const day = new Date(s.started_at).getDay();
        weekData[day] += (s.duration_seconds || 0) / 3600;
      });
      setWeeklyData(days.map((day, i) => ({ day, horas: Math.round(weekData[i] * 10) / 10 })));

      // Subject performance
      const subjectMap: Record<string, { name: string; correct: number; total: number }> = {};
      const subjects = subjectsRes.data ?? [];
      // Get questions with subject_id for the answers
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
    { label: "Horas de Estudo", value: `${stats.hours}h`, icon: Clock, color: "text-primary" },
    { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, color: "text-gold" },
    { label: "Aulas Concluídas", value: stats.lessonsCompleted, icon: BookOpen, color: "text-highlight" },
    { label: "Questões Respondidas", value: stats.questionsAnswered, icon: BarChart3, color: "text-green-400" },
    { label: "Sequência de Dias", value: `${stats.streak} 🔥`, icon: Flame, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Seu progresso individual • <span className="text-gold font-medium">{levelName}</span>
          </p>
        </div>
      </div>

      {/* Study Timer */}
      <StudyTimer />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="glass-card hover:border-primary/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-heading font-bold font-mono">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Estudo Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" stroke="hsl(0, 0%, 63%)" fontSize={12} />
                <YAxis stroke="hsl(0, 0%, 63%)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="horas" fill="hsl(217, 99%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" /> Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-heading font-bold font-mono text-primary">{stats.accuracy}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      {subjectStats.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-highlight" /> Desempenho por Matéria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectStats} layout="vertical">
                <XAxis type="number" domain={[0, 100]} stroke="hsl(0, 0%, 63%)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(0, 0%, 63%)" fontSize={11} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="acerto" fill="hsl(43, 76%, 53%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
