import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, BookOpen, Award, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ hours: 0, accuracy: 0, lessonsCompleted: 0, questionsAnswered: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sessionsRes, answersRes, progressRes] = await Promise.all([
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct").eq("user_id", user.id),
        supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
      ]);

      const totalSeconds = sessionsRes.data?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) ?? 0;
      const answers = answersRes.data ?? [];
      const correct = answers.filter(a => a.is_correct).length;

      setStats({
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
        lessonsCompleted: progressRes.data?.length ?? 0,
        questionsAnswered: answers.length,
      });

      // Weekly mock data based on real sessions
      const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      setWeeklyData(days.map(day => ({ day, horas: Math.round(Math.random() * totalSeconds / 3600 * 10) / 10 || 0 })));
    };
    fetchStats();
  }, [user]);

  const levelName = profile?.levels?.name || "Recruta";
  const COLORS = ["hsl(217, 99%, 50%)", "hsl(43, 76%, 53%)", "hsl(210, 70%, 55%)", "hsl(160, 60%, 45%)"];

  const pieData = [
    { name: "Acertos", value: stats.accuracy },
    { name: "Erros", value: 100 - stats.accuracy },
  ];

  const cards = [
    { label: "Horas de Estudo", value: `${stats.hours}h`, icon: Clock, color: "text-primary" },
    { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, color: "text-gold" },
    { label: "Aulas Concluídas", value: stats.lessonsCompleted, icon: BookOpen, color: "text-highlight" },
    { label: "Questões Respondidas", value: stats.questionsAnswered, icon: BarChart3, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Seu progresso individual • <span className="text-gold font-medium">{levelName}</span></p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-heading font-bold font-mono">{c.value}</p>
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
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px" }} />
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
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? COLORS[0] : "hsl(0, 0%, 15%)"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
