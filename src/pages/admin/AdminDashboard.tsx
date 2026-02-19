/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, BookOpen, HelpCircle, FileText, Crown, TrendingUp, Activity, Trophy,
  AlertTriangle, DollarSign, CreditCard, Clock, ScrollText, Percent, ArrowUpRight,
  UserPlus, BarChart3, Zap, Brain, PenLine,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, subjects: 0, questions: 0, lessons: 0, premium: 0, active: 0,
    expiringSoon: 0, achievements: 0, blocked: 0, freeUsers: 0, trialUsers: 0,
    totalAnswers: 0, totalStudyHours: 0, avgAccuracy: 0,
  });
  const [planData, setPlanData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState({ total: 0, monthly: 0, annual: 0 });
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newUsersChart, setNewUsersChart] = useState<any[]>([]);
  const [studyChart, setStudyChart] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [u, s, q, l, subs, sessions, achCount, payReqs, answers, profiles] = await Promise.all([
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status, expire_date"),
        supabase.from("study_sessions").select("user_id, duration_seconds, started_at").order("started_at", { ascending: false }).limit(200),
        supabase.from("user_achievements").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_answers").select("is_correct", { count: "exact" }),
        supabase.from("profiles").select("user_id, name, created_at").order("created_at", { ascending: false }),
      ]);

      setPendingPayments(payReqs.count ?? 0);

      const subsData = subs.data ?? [];
      const premium = subsData.filter(s => s.plan !== "gratuito" && s.plan !== "premium_teste" && s.status === "active").length;
      const active = subsData.filter(s => s.status === "active").length;
      const blocked = subsData.filter(s => s.status === "blocked").length;
      const freeUsers = subsData.filter(s => s.plan === "gratuito").length;
      const trialUsers = subsData.filter(s => (s.plan === "premium_teste" || s.plan === "trial") && s.status === "active").length;

      const now = new Date();
      const week = new Date(now.getTime() + 7 * 86400000);
      const expiringSoon = subsData.filter(s => s.expire_date && new Date(s.expire_date) <= week && new Date(s.expire_date) >= now).length;

      // Revenue
      const { data: paidPayments } = await supabase.from("payment_requests").select("plan, amount").eq("status", "approved").not("mp_payment_id", "is", null);
      const total = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const monthlyR = (paidPayments ?? []).filter(p => p.plan === "premium_mensal").reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const annualR = (paidPayments ?? []).filter(p => p.plan === "premium_anual").reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setRevenueData({ total, monthly: monthlyR, annual: annualR });

      // Answers stats
      const allAnswers = answers.data ?? [];
      const correctAnswers = allAnswers.filter(a => a.is_correct).length;
      const avgAccuracy = allAnswers.length > 0 ? Math.round((correctAnswers / allAnswers.length) * 100) : 0;

      // Study hours
      const sessionsData = sessions.data ?? [];
      const totalStudySeconds = sessionsData.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

      setStats({
        users: u.count ?? 0,
        subjects: s.count ?? 0,
        questions: q.count ?? 0,
        lessons: l.count ?? 0,
        premium,
        active,
        expiringSoon,
        achievements: achCount.count ?? 0,
        blocked,
        freeUsers,
        trialUsers,
        totalAnswers: answers.count ?? 0,
        totalStudyHours: Math.round(totalStudySeconds / 3600),
        avgAccuracy,
      });

      // Plan distribution
      const planCount: Record<string, number> = { gratuito: 0, premium_mensal: 0, premium_anual: 0, premium_teste: 0 };
      subsData.forEach(s => {
        const plan = s.plan === "trial" ? "premium_teste" : s.plan;
        planCount[plan] = (planCount[plan] || 0) + 1;
      });
      setPlanData([
        { name: "Gratuito", value: planCount.gratuito, fill: "hsl(var(--muted-foreground))" },
        { name: "Mensal", value: planCount.premium_mensal, fill: "hsl(217, 99%, 50%)" },
        { name: "Anual", value: planCount.premium_anual, fill: "hsl(43, 76%, 53%)" },
        { name: "Teste", value: planCount.premium_teste, fill: "hsl(280, 70%, 55%)" },
      ].filter(p => p.value > 0));

      // New users last 30 days
      const profilesData = profiles.data ?? [];
      const profileMap: Record<string, string> = {};
      profilesData.forEach(p => { profileMap[p.user_id] = p.name; });

      const thirtyAgo = new Date(Date.now() - 30 * 86400000);
      const newUsersMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        newUsersMap[d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })] = 0;
      }
      (u.data ?? []).forEach((p: any) => {
        if (new Date(p.created_at) >= thirtyAgo) {
          const key = new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (newUsersMap[key] !== undefined) newUsersMap[key]++;
        }
      });
      setNewUsersChart(Object.entries(newUsersMap).map(([date, count]) => ({ date, novos: count })));

      // Study hours last 7 days
      const sevenAgo = new Date(Date.now() - 7 * 86400000);
      const studyMap: Record<string, number> = {};
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        studyMap[dayNames[d.getDay()]] = 0;
      }
      sessionsData.filter(s => new Date(s.started_at) >= sevenAgo).forEach(s => {
        const day = dayNames[new Date(s.started_at).getDay()];
        if (studyMap[day] !== undefined) studyMap[day] += (s.duration_seconds || 0) / 3600;
      });
      setStudyChart(Object.entries(studyMap).map(([dia, horas]) => ({ dia, horas: Math.round(horas * 10) / 10 })));

      // Recent activity
      setRecentActivity(sessionsData.slice(0, 10).map(s => ({
        name: profileMap[s.user_id] || "Aluno",
        duration: Math.round((s.duration_seconds || 0) / 60),
        date: new Date(s.started_at).toLocaleDateString("pt-BR"),
        time: new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      })));
    };
    fetchAll();
  }, []);

  const conversionRate = stats.users > 0 ? Math.round((stats.premium / stats.users) * 100) : 0;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pendingPayments > 0 && (
            <Link to="/admin/pagamentos">
              <Badge className="bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                <CreditCard className="w-3 h-3 mr-1" /> {pendingPayments} pendente(s)
              </Badge>
            </Link>
          )}
          {stats.expiringSoon > 0 && (
            <Link to="/admin/assinaturas">
              <Badge className="bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20 cursor-pointer">
                <AlertTriangle className="w-3 h-3 mr-1" /> {stats.expiringSoon} expirando
              </Badge>
            </Link>
          )}
          {stats.blocked > 0 && (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
              {stats.blocked} bloqueado(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Revenue card */}
      <Card className="glass-card border-accent/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5" />
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-lg shadow-accent/20">
              <DollarSign className="w-7 h-7 text-background" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Real Total</p>
              <p className="text-3xl font-heading font-bold font-mono text-accent">
                R$ {revenueData.total.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm flex-wrap items-center">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Mensal</p>
              <p className="font-mono font-bold text-lg">R$ {revenueData.monthly.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Anual</p>
              <p className="font-mono font-bold text-lg">R$ {revenueData.annual.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Conversão</p>
              <p className="font-mono font-bold text-lg text-primary">{conversionRate}%</p>
            </div>
            <Link to="/admin/pagamentos">
              <Button size="sm" variant="outline" className="gap-1 text-xs">
                <BarChart3 className="w-3.5 h-3.5" /> Detalhes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Alunos", value: stats.users, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Premium", value: stats.premium, icon: Crown, color: "text-accent", bg: "bg-accent/10" },
          { label: "Gratuitos", value: stats.freeUsers, icon: Users, color: "text-muted-foreground", bg: "bg-muted/30" },
          { label: "Em Teste", value: stats.trialUsers, icon: Zap, color: "text-[hsl(280,70%,55%)]", bg: "bg-[hsl(280,70%,55%)]/10" },
          { label: "Questões", value: stats.questions, icon: HelpCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: "Aulas", value: stats.lessons, icon: FileText, color: "text-[hsl(142,71%,45%)]", bg: "bg-[hsl(142,71%,45%)]/10" },
          { label: "Respostas", value: stats.totalAnswers, icon: Brain, color: "text-accent", bg: "bg-accent/10" },
          { label: "Horas Estudo", value: `${stats.totalStudyHours}h`, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
        ].map((c, i) => (
          <Card key={i} className="glass-card hover:border-primary/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <p className="text-xl font-heading font-bold font-mono">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform health */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Saúde da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa de Acerto Média</span>
              <span className="font-mono font-bold">{stats.avgAccuracy}%</span>
            </div>
            <Progress value={stats.avgAccuracy} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Conversão Free → Premium</span>
              <span className="font-mono font-bold">{conversionRate}%</span>
            </div>
            <Progress value={conversionRate} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Conteúdo</span>
              <span className="font-mono font-bold">{stats.subjects} matérias</span>
            </div>
            <Progress value={Math.min(100, stats.subjects * 10)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New users chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[hsl(142,71%,45%)]" /> Novos Alunos (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={newUsersChart}>
                <defs>
                  <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} interval={4} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="novos" stroke="hsl(142, 71%, 45%)" fill="url(#newUsersGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-accent" /> Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {planData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study hours */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Horas de Estudo (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={studyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="horas" fill="hsl(217, 99%, 50%)" radius={[6, 6, 0, 0]} name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Atividade Recente
              </span>
              <Link to="/admin/logs">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <ScrollText className="w-3.5 h-3.5" /> Ver Logs
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-xs">{a.name}</span>
                      <span className="text-muted-foreground text-[10px] ml-1.5">{a.date} {a.time}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">{a.duration}min</Badge>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sem atividade recente.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" /> Acesso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Usuários", url: "/admin/usuarios", icon: Users },
            { label: "Assinaturas", url: "/admin/assinaturas", icon: Crown },
            { label: "Pagamentos", url: "/admin/pagamentos", icon: CreditCard },
            { label: "Conteúdo", url: "/admin/conteudo", icon: BookOpen },
            { label: "Questões", url: "/admin/questoes", icon: HelpCircle },
            { label: "Redações", url: "/admin/redacoes", icon: PenLine },
            { label: "Notificações", url: "/admin/notificacoes", icon: FileText },
            { label: "IA Admin", url: "/admin/ia", icon: Brain },
            { label: "Planos & Cupons", url: "/admin/planos", icon: Crown },
            { label: "Logs", url: "/admin/logs", icon: ScrollText },
          ].map((item, i) => (
            <Link key={i} to={item.url}>
              <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs">
                <item.icon className="w-4 h-4 text-primary" /> {item.label}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
