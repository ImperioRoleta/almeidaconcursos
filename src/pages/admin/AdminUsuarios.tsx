/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Shield, Search, Ban, CheckCircle, Crown, User, Gift, Clock, ShieldCheck, ShieldOff, AlertTriangle, RotateCcw, TrendingUp, BookOpen, Target, PenLine, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type MergedUser = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  subscription: { plan: string; status: string; expire_date: string | null } | null;
  roles: { role: string }[];
};

export default function AdminUsuarios() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Dialogs
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState<{ userId: string; name: string; isAdmin: boolean } | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<{ userId: string; name: string } | null>(null);

  const [grantPlan, setGrantPlan] = useState("premium_mensal");
  const [grantDays, setGrantDays] = useState("30");
  const [trialDays, setTrialDays] = useState("7");
  const [processing, setProcessing] = useState(false);

  // Performance View State
  const [showPerformance, setShowPerformance] = useState<{ userId: string; name: string } | null>(null);
  const [userStats, setUserStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchUserStats = async (userId: string) => {
    setLoadingStats(true);
    setUserStats(null);
    try {
      const [progressRes, lessonsRes, essayRes, simRes, answersRes, sessionsRes] = await Promise.all([
        supabase.from("user_progress").select("lesson_id").eq("user_id", userId).eq("completed", true),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("essays").select("id, title, score, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("simulation_results").select("*, simulation:simulations(title)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_answers").select("is_correct").eq("user_id", userId),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", userId),
      ]);

      const completedCount = progressRes.data?.length || 0;
      const totalLessons = lessonsRes.count || 0;
      const essays = essayRes.data || [];
      const simulations = simRes.data?.map((r: any) => ({ ...r, title: r.simulation?.title })) || [];

      const answers = answersRes.data || [];
      const correctAnswers = answers.filter((a: any) => a.is_correct).length;
      const avgAccuracy = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;

      const totalSeconds = (sessionsRes.data || []).reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0);
      const studyHours = totalSeconds / 3600;

      setUserStats({
        completedLessons: completedCount,
        totalLessons,
        essays,
        essaysCount: essays.length,
        simulations,
        avgAnswerAccuracy: avgAccuracy,
        studyHours,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast.error("Erro ao carregar estatísticas.");
    }
    setLoadingStats(false);
  };

  useEffect(() => {
    if (showPerformance) {
      fetchUserStats(showPerformance.userId);
    }
  }, [showPerformance]);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, subsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const profiles = profilesRes.data ?? [];
    const subs = subsRes.data ?? [];
    const roles = rolesRes.data ?? [];

    const subsMap: Record<string, any> = {};
    subs.forEach(s => { subsMap[s.user_id] = s; });

    const rolesMap: Record<string, any[]> = {};
    roles.forEach(r => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r);
    });

    const merged: MergedUser[] = profiles.map(p => ({
      ...p,
      subscription: subsMap[p.user_id] || null,
      roles: rolesMap[p.user_id] || [],
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- Admin toggle ---
  const handleToggleAdmin = async () => {
    if (!adminUser || !showAdminConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_toggle_role", {
      _admin_user_id: adminUser.id,
      _target_user_id: showAdminConfirm.userId,
      _role: "admin",
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(result.action === "added" ? "Admin concedido!" : "Admin removido!");
      setShowAdminConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Block/Unblock ---
  const handleToggleBlock = async () => {
    if (!adminUser || !showBlockConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_block_user", {
      _admin_user_id: adminUser.id,
      _target_user_id: showBlockConfirm.userId,
      _block: !showBlockConfirm.isBlocked,
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(result.blocked ? "Usuário bloqueado!" : "Usuário desbloqueado!");
      setShowBlockConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Bulk grant subscription ---
  const grantSubscription = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_grant_subscription", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _plan: grantPlan,
      _duration_days: parseInt(grantDays),
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(`Assinatura concedida para ${result.updated} usuário(s)!`);
      setShowGrantDialog(false);
      setSelectedUsers(new Set());
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Bulk grant trial ---
  const grantTrial = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_grant_trial", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _duration_days: parseInt(trialDays),
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(`Premium Teste concedido para ${result.updated} usuário(s)!`);
      setShowTrialDialog(false);
      setSelectedUsers(new Set());
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Reset user data ---
  const handleResetUser = async () => {
    if (!adminUser || !showResetConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_reset_user_data", {
      _admin_user_id: adminUser.id,
      _target_user_id: showResetConfirm.userId,
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(`Progresso de "${showResetConfirm.name}" resetado com sucesso!`);
      setShowResetConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Selection ---
  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q);
  });

  const selectAll = () => {
    setSelectedUsers(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(u => u.user_id))
    );
  };

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", premium_teste: "Premium Teste",
  };
  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/10 text-primary border-primary/30",
    premium_anual: "bg-accent/10 text-accent border-accent/30",
    premium_teste: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)] border-[hsl(280,70%,55%)]/30",
  };

  const durationPresets = [
    { label: "7 dias", value: "7" },
    { label: "15 dias", value: "15" },
    { label: "30 dias (1 mês)", value: "30" },
    { label: "90 dias (3 meses)", value: "90" },
    { label: "180 dias (6 meses)", value: "180" },
    { label: "365 dias (1 ano)", value: "365" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <p className="text-muted-foreground text-sm">{users.length} usuários cadastrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedUsers.size > 0 && (
            <>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {selectedUsers.size} selecionado(s)
              </Badge>
              <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={() => setShowGrantDialog(true)}>
                <Crown className="w-4 h-4" /> Dar Assinatura
              </Button>
              <Button size="sm" variant="outline" className="gap-1 border-[hsl(280,70%,55%)]/30 text-[hsl(280,70%,55%)]" onClick={() => setShowTrialDialog(true)}>
                <Gift className="w-4 h-4" /> Premium Teste
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search & Select All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedUsers.size === filtered.length ? "Desmarcar Todos" : "Selecionar Todos"}
        </Button>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const plan = u.subscription?.plan || "gratuito";
            const status = u.subscription?.status || "active";
            const isAdmin = u.roles?.some(r => r.role === "admin");
            const isBlocked = status === "blocked";
            const isSelected = selectedUsers.has(u.user_id);
            const expireDate = u.subscription?.expire_date;
            const daysLeft = expireDate ? Math.max(0, Math.ceil((new Date(expireDate).getTime() - Date.now()) / 86400000)) : null;

            return (
              <Card key={u.id} className={`glass-card transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "hover:border-primary/20"} ${isBlocked ? "opacity-60 border-destructive/30" : ""}`}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  {/* Left: checkbox + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectUser(u.user_id)} />
                    <Avatar className="w-9 h-9 shrink-0">
                      {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.name} /> : null}
                      <AvatarFallback className={isAdmin ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}>
                        {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-sm truncate">{u.name || "Sem nome"}</p>
                        {isAdmin && <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">Admin</Badge>}
                        {isBlocked && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">{u.user_id.slice(0, 16)}...</p>
                    </div>
                  </div>

                  {/* Right: badges + actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[11px] ${planColors[plan] || planColors.gratuito}`}>
                      <Crown className="w-3 h-3 mr-1" />
                      {planLabels[plan] || plan}
                    </Badge>
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {daysLeft}d
                      </span>
                    )}

                    {/* Toggle Admin */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-1 h-7 text-xs ${isAdmin ? "border-accent/50 text-accent" : "border-muted-foreground/30"}`}
                      onClick={() => setShowAdminConfirm({ userId: u.user_id, name: u.name || "Sem nome", isAdmin: !!isAdmin })}
                    >
                      {isAdmin ? <><ShieldOff className="w-3 h-3" /> Remover Admin</> : <><ShieldCheck className="w-3 h-3" /> Dar Admin</>}
                    </Button>

                    {/* View Performance */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs border-primary/30 text-primary"
                      onClick={() => setShowPerformance({ userId: u.user_id, name: u.name || "Sem nome" })}
                    >
                      <TrendingUp className="w-3 h-3" /> Desempenho
                    </Button>

                    {/* Reset Progress */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs border-orange-500/30 text-orange-500"
                      onClick={() => setShowResetConfirm({ userId: u.user_id, name: u.name || "Sem nome" })}
                    >
                      <RotateCcw className="w-3 h-3" /> Resetar
                    </Button>

                    {/* Block/Unblock */}
                    <Button
                      variant={isBlocked ? "outline" : "destructive"}
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => setShowBlockConfirm({ userId: u.user_id, name: u.name || "Sem nome", isBlocked })}
                    >
                      {isBlocked ? <><CheckCircle className="w-3 h-3" /> Desbloquear</> : <><Ban className="w-3 h-3" /> Bloquear</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>}
        </div>
      )}

      {/* Admin Confirm Dialog */}
      <Dialog open={!!showAdminConfirm} onOpenChange={() => setShowAdminConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              {showAdminConfirm?.isAdmin ? "Remover Admin" : "Conceder Admin"}
            </DialogTitle>
            <DialogDescription>
              {showAdminConfirm?.isAdmin
                ? `Remover permissões de administrador de "${showAdminConfirm?.name}"? Este usuário perderá acesso ao painel administrativo.`
                : `Conceder permissões de administrador para "${showAdminConfirm?.name}"? Este usuário terá acesso total ao painel administrativo.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAdminConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleToggleAdmin}
              disabled={processing}
              className={showAdminConfirm?.isAdmin ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground"}
            >
              {processing ? "Processando..." : showAdminConfirm?.isAdmin ? "Remover Admin" : "Conceder Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Confirm Dialog */}
      <Dialog open={!!showBlockConfirm} onOpenChange={() => setShowBlockConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {showBlockConfirm?.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
            </DialogTitle>
            <DialogDescription>
              {showBlockConfirm?.isBlocked
                ? `Desbloquear "${showBlockConfirm?.name}"? O usuário poderá acessar a plataforma novamente.`
                : `Bloquear "${showBlockConfirm?.name}"? O usuário não poderá acessar a plataforma enquanto estiver bloqueado.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowBlockConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleToggleBlock}
              disabled={processing}
              variant={showBlockConfirm?.isBlocked ? "default" : "destructive"}
            >
              {processing ? "Processando..." : showBlockConfirm?.isBlocked ? "Desbloquear" : "Bloquear Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirm Dialog */}
      <Dialog open={!!showResetConfirm} onOpenChange={() => setShowResetConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Resetar Progresso
            </DialogTitle>
            <DialogDescription>
              Isso vai apagar <span className="font-semibold text-foreground">TODOS</span> os dados de progresso de "{showResetConfirm?.name}" — questões, aulas, conquistas, simulados, redações, diagnóstico e sessões de estudo. Nome, email e assinatura serão preservados. Esta ação é irreversível!
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(null)}>Cancelar</Button>
            <Button onClick={handleResetUser} disabled={processing} className="bg-orange-500 text-white hover:bg-orange-600">
              {processing ? "Processando..." : "Confirmar Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Subscription Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Dar Assinatura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conceder assinatura para <span className="font-semibold text-foreground">{selectedUsers.size}</span> usuário(s)
            </p>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={grantPlan} onValueChange={setGrantPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                  <SelectItem value="premium_anual">Premium Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={grantDays} onValueChange={setGrantDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {durationPresets.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantSubscription} disabled={processing} className="w-full gradient-primary text-primary-foreground">
              {processing ? "Processando..." : `Conceder para ${selectedUsers.size} usuário(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Teste Dialog */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Gift className="w-5 h-5 text-[hsl(280,70%,55%)]" /> Premium Teste
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conceder Premium Teste para <span className="font-semibold text-foreground">{selectedUsers.size}</span> usuário(s)
            </p>
            <p className="text-xs text-muted-foreground">Acesso completo a todos os recursos premium durante o período.</p>
            <div className="space-y-2">
              <Label>Duração do Premium Teste</Label>
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantTrial} disabled={processing} className="w-full bg-[hsl(280,70%,55%)] text-white hover:bg-[hsl(280,70%,50%)]">
              {processing ? "Processando..." : `Conceder Premium Teste para ${selectedUsers.size} usuário(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance View Dialog */}
      <Dialog open={!!showPerformance} onOpenChange={() => setShowPerformance(null)}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Desempenho do Aluno
            </DialogTitle>
            <DialogDescription>
              Análise detalhada de {showPerformance?.name}
            </DialogDescription>
          </DialogHeader>

          {loadingStats ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !userStats ? (
            <p className="text-center text-muted-foreground py-8">Dados não disponíveis.</p>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="glass-card bg-primary/5 border-primary/20">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold font-mono">{userStats.completedLessons}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Aulas Concluídas</p>
                  </CardContent>
                </Card>
                <Card className="glass-card bg-accent/5 border-accent/20">
                  <CardContent className="p-4 text-center">
                    <Target className="w-5 h-5 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold font-mono">{userStats.avgAnswerAccuracy}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Precisão Geral</p>
                  </CardContent>
                </Card>
                <Card className="glass-card bg-[hsl(280,70%,55%)]/5 border-[hsl(280,70%,55%)]/20">
                  <CardContent className="p-4 text-center">
                    <PenLine className="w-5 h-5 text-[hsl(280,70%,55%)] mx-auto mb-2" />
                    <p className="text-2xl font-bold font-mono">{userStats.essaysCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Redações</p>
                  </CardContent>
                </Card>
                <Card className="glass-card bg-[hsl(25,95%,53%)]/5 border-[hsl(25,95%,53%)]/20">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 text-[hsl(25,95%,53%)] mx-auto mb-2" />
                    <p className="text-2xl font-bold font-mono">{userStats.studyHours.toFixed(1)}h</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Tempo de Estudo</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do Curso</span>
                  <span className="font-semibold">{Math.round((userStats.completedLessons / Math.max(userStats.totalLessons, 1)) * 100)}%</span>
                </div>
                <Progress value={(userStats.completedLessons / Math.max(userStats.totalLessons, 1)) * 100} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">{userStats.totalLessons} aulas totais</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Essays */}
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><PenLine className="w-4 h-4 text-primary" /> Redações Recentes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {userStats.essays.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhuma redação enviada.</p>
                    ) : (
                      userStats.essays.slice(0, 5).map((e: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                          <span className="truncate max-w-[150px]">{e.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                            <Badge variant={e.score >= 800 ? "default" : "secondary"} className="h-5 text-[10px]">
                              {e.score || "Aguardando"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Simulations */}
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Últimos Simulados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {userStats.simulations.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum simulado realizado.</p>
                    ) : (
                      userStats.simulations.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                          <span className="truncate max-w-[150px]">{s.title || "Simulado"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                            <span className={`font-mono font-bold ${s.score >= 70 ? "text-green-500" : "text-[hsl(var(--chart-4))]"}`}>
                              {s.score}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
