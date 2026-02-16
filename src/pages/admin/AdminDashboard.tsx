import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, HelpCircle, FileText, Crown, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, subjects: 0, questions: 0, lessons: 0, premium: 0, active: 0 });
  const [planData, setPlanData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [u, s, q, l, subs, sessions] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status"),
        supabase.from("study_sessions").select("user_id, duration_seconds, started_at").order("started_at", { ascending: false }).limit(50),
      ]);

      const subsData = subs.data ?? [];
      const premium = subsData.filter(s => s.plan !== "gratuito" && s.status === "active").length;
      const active = subsData.filter(s => s.status === "active").length;

      setStats({
        users: u.count ?? 0,
        subjects: s.count ?? 0,
        questions: q.count ?? 0,
        lessons: l.count ?? 0,
        premium,
        active,
      });

      // Plan distribution
      const planCount: Record<string, number> = { gratuito: 0, premium_mensal: 0, premium_anual: 0 };
      subsData.forEach(s => { planCount[s.plan] = (planCount[s.plan] || 0) + 1; });
      setPlanData([
        { name: "Gratuito", value: planCount.gratuito, fill: "hsl(0, 0%, 40%)" },
        { name: "Mensal", value: planCount.premium_mensal, fill: "hsl(217, 99%, 50%)" },
        { name: "Anual", value: planCount.premium_anual, fill: "hsl(43, 76%, 53%)" },
      ]);

      // Recent sessions
      const sessionsData = sessions.data ?? [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.name; });

      setRecentActivity(sessionsData.slice(0, 8).map(s => ({
        name: profileMap[s.user_id] || "Aluno",
        duration: Math.round((s.duration_seconds || 0) / 60),
        date: new Date(s.started_at).toLocaleDateString("pt-BR"),
      })));
    };
    fetchAll();
  }, []);

  const cards = [
    { label: "Total de Alunos", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Matérias", value: stats.subjects, icon: BookOpen, color: "text-gold" },
    { label: "Questões", value: stats.questions, icon: HelpCircle, color: "text-highlight" },
    { label: "Aulas", value: stats.lessons, icon: FileText, color: "text-green-400" },
    { label: "Premium Ativos", value: stats.premium, icon: Crown, color: "text-gold" },
    { label: "Usuários Ativos", value: stats.active, icon: Activity, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold">Painel Administrativo</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="glass-card hover:border-primary/20 transition-colors">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" /> Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {planData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground ml-2">• {a.date}</span>
                  </div>
                  <span className="font-mono text-primary">{a.duration} min</span>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-muted-foreground text-sm">Sem atividade recente.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
