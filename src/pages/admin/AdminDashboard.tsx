import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, HelpCircle, FileText, Crown, TrendingUp, Activity, Trophy, AlertTriangle, DollarSign, CreditCard, Clock, ScrollText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, subjects: 0, questions: 0, lessons: 0, premium: 0, active: 0, expiringSoon: 0, achievements: 0 });
  const [planData, setPlanData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [revenueEstimate, setRevenueEstimate] = useState({ monthly: 0, annual: 0 });
  const [pendingPayments, setPendingPayments] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      const [u, s, q, l, subs, sessions, achCount, payReqs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status, expire_date"),
        supabase.from("study_sessions").select("user_id, duration_seconds, started_at").order("started_at", { ascending: false }).limit(50),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setPendingPayments(payReqs.count ?? 0);

      const subsData = subs.data ?? [];
      const premium = subsData.filter(s => s.plan !== "gratuito" && s.status === "active").length;
      const active = subsData.filter(s => s.status === "active").length;
      
      // Expiring in next 7 days
      const now = new Date();
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoon = subsData.filter(s => s.expire_date && new Date(s.expire_date) <= week && new Date(s.expire_date) >= now).length;

      // Revenue estimate — only count real paid subscriptions (not manual/test grants)
      // We check payment_requests with mp_payment_id to know who actually paid
      const { data: paidPayments } = await supabase.from("payment_requests").select("plan, amount").eq("status", "approved").not("mp_payment_id", "is", null);
      const paidRevenue = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const monthlyPaid = (paidPayments ?? []).filter(p => p.plan === "premium_mensal").reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const annualPaid = (paidPayments ?? []).filter(p => p.plan === "premium_anual").reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setRevenueEstimate({ monthly: monthlyPaid, annual: annualPaid });

      setStats({
        users: u.count ?? 0,
        subjects: s.count ?? 0,
        questions: q.count ?? 0,
        lessons: l.count ?? 0,
        premium,
        active,
        expiringSoon,
        achievements: achCount.count ?? 0,
      });

      const planCount: Record<string, number> = { gratuito: 0, premium_mensal: 0, premium_anual: 0 };
      subsData.forEach(s => { planCount[s.plan] = (planCount[s.plan] || 0) + 1; });
      setPlanData([
        { name: "Gratuito", value: planCount.gratuito, fill: "hsl(0, 0%, 40%)" },
        { name: "Mensal", value: planCount.premium_mensal, fill: "hsl(217, 99%, 50%)" },
        { name: "Anual", value: planCount.premium_anual, fill: "hsl(43, 76%, 53%)" },
      ]);

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
    { label: "Premium Ativos", value: stats.premium, icon: Crown, color: "text-accent" },
    { label: "Questões", value: stats.questions, icon: HelpCircle, color: "text-[hsl(210,80%,55%)]" },
    { label: "Aulas", value: stats.lessons, icon: FileText, color: "text-[hsl(142,71%,45%)]" },
    { label: "Conquistas", value: stats.achievements, icon: Trophy, color: "text-accent" },
    { label: "Ativos", value: stats.active, icon: Activity, color: "text-primary" },
  ];

  const totalRevenue = revenueEstimate.monthly + revenueEstimate.annual;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-heading text-2xl font-bold">Painel Administrativo</h1>
        <div className="flex gap-2">
          {pendingPayments > 0 && (
            <Link to="/admin/pagamentos">
              <Badge className="bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                <CreditCard className="w-3 h-3 mr-1" /> {pendingPayments} pagamento(s) pendente(s)
              </Badge>
            </Link>
          )}
          {stats.expiringSoon > 0 && (
            <Badge className="bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20">
              <AlertTriangle className="w-3 h-3 mr-1" /> {stats.expiringSoon} expirando
            </Badge>
          )}
        </div>
      </div>

      {/* Revenue card */}
      <Card className="glass-card border-accent/20">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-background" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Real (pagamentos MP)</p>
              <p className="text-2xl font-heading font-bold font-mono text-accent">
                R$ {totalRevenue.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm flex-wrap">
            <div>
              <p className="text-muted-foreground">Via Mensal</p>
              <p className="font-mono font-semibold">R$ {revenueEstimate.monthly.toFixed(2).replace(".", ",")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Via Anual</p>
              <p className="font-mono font-semibold">R$ {revenueEstimate.annual.toFixed(2).replace(".", ",")}</p>
            </div>
            <Link to="/admin/logs" className="self-center">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <ScrollText className="w-3.5 h-3.5" /> Ver Logs
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 7%)", border: "1px solid hsl(0, 0%, 15%)", borderRadius: "8px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
