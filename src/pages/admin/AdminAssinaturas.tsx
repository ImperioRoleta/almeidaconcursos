/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Crown, Search, Calendar, User, Clock, Gift, Zap, RefreshCw, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const PLAN_LABELS: Record<string, string> = {
  gratuito: "Gratuito",
  premium_mensal: "Premium Mensal",
  premium_anual: "Premium Anual",
  premium_teste: "Premium Teste",
  trial: "Premium Teste", // legacy compat
};

const PLAN_COLORS: Record<string, string> = {
  gratuito: "bg-muted text-muted-foreground",
  premium_mensal: "bg-primary/10 text-primary",
  premium_anual: "bg-accent/10 text-accent",
  premium_teste: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)]",
  trial: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-[hsl(142,71%,45%)]",
  blocked: "text-destructive",
  inactive: "text-muted-foreground",
};

const DURATION_PRESETS = [
  { label: "3 dias", value: "3" },
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "30 dias (1 mês)", value: "30" },
  { label: "90 dias (3 meses)", value: "90" },
  { label: "180 dias (6 meses)", value: "180" },
  { label: "365 dias (1 ano)", value: "365" },
];

export default function AdminAssinaturas() {
  const { user: adminUser, isAdmin } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editSub, setEditSub] = useState<any>(null);
  const [expireDate, setExpireDate] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [grantPlan, setGrantPlan] = useState("premium_mensal");
  const [grantDays, setGrantDays] = useState("30");
  const [trialDays, setTrialDays] = useState("7");
  const [granting, setGranting] = useState(false);
  const [checkingExpired, setCheckingExpired] = useState(false);

  const fetchSubs = async () => {
    setLoading(true);
    const [subsRes, profilesRes] = await Promise.all([
      supabase.from("subscriptions").select("*"),
      supabase.from("profiles").select("user_id, name"),
    ]);

    const profiles = profilesRes.data ?? [];
    const profileMap: Record<string, string> = {};
    profiles.forEach(p => { profileMap[p.user_id] = p.name; });

    const merged = (subsRes.data ?? []).map(s => ({
      ...s,
      // normalize legacy "trial" to "premium_teste"
      plan: s.plan === "trial" ? "premium_teste" : s.plan,
      userName: profileMap[s.user_id] || "Sem nome",
    }));

    setSubs(merged);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const openEdit = (sub: any) => {
    setEditSub(sub);
    setExpireDate(sub.expire_date ? sub.expire_date.split("T")[0] : "");
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
  };

  const saveEdit = async () => {
    if (!editSub) return;
    if (!isAdmin) { toast.error("Apenas administradores podem editar assinaturas."); return; }
    const { error } = await supabase.from("subscriptions").update({
      plan: editPlan,
      status: editStatus,
      expire_date: expireDate ? new Date(expireDate).toISOString() : null,
    }).eq("id", editSub.id);
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    toast.success("Assinatura atualizada!");
    setEditSub(null);
    fetchSubs();
  };

  const grantSubscription = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    if (!isAdmin) { toast.error("Sem permissão de administrador."); return; }
    setGranting(true);
    const { data, error } = await supabase.rpc("admin_grant_subscription", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _plan: grantPlan,
      _duration_days: parseInt(grantDays),
    });
    setGranting(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(`Assinatura concedida para ${result.updated} usuário(s)!`);
      setShowGrantDialog(false);
      setSelectedUsers(new Set());
      fetchSubs();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  const grantTrial = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    if (!isAdmin) { toast.error("Sem permissão de administrador."); return; }
    setGranting(true);
    const { data, error } = await supabase.rpc("admin_grant_trial", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _duration_days: parseInt(trialDays),
    });
    setGranting(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success(`Premium Teste concedido para ${result.updated} usuário(s)!`);
      setShowTrialDialog(false);
      setSelectedUsers(new Set());
      fetchSubs();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  const runExpiredCheck = async () => {
    setCheckingExpired(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Você precisa estar logado"); setCheckingExpired(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-expired-subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao verificar"); setCheckingExpired(false); return; }
      toast.success(`${data.expired_count || 0} assinatura(s) expirada(s) processada(s).`);
      fetchSubs();
    } catch { toast.error("Erro ao verificar"); }
    setCheckingExpired(false);
  };

  const selectAll = () => {
    if (selectedUsers.size === filtered.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filtered.map(s => s.user_id)));
  };

  const filtered = subs.filter(s => {
    const q = search.toLowerCase();
    return !q || s.userName.toLowerCase().includes(q) || s.user_id.toLowerCase().includes(q);
  });

  const premiumCount = subs.filter(s => s.plan !== "gratuito" && s.plan !== "premium_teste" && s.status === "active").length;
  const trialCount = subs.filter(s => s.plan === "premium_teste" && s.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-accent" /> Gestão de Assinaturas
          </h1>
          <p className="text-muted-foreground text-sm">{subs.length} total • {premiumCount} premium • {trialCount} premium teste</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={runExpiredCheck} disabled={checkingExpired}>
            <RefreshCw className={`w-4 h-4 mr-1 ${checkingExpired ? "animate-spin" : ""}`} />
            Verificar Expiradas
          </Button>
          {selectedUsers.size > 0 && (
            <>
              <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={() => setShowGrantDialog(true)}>
                <Crown className="w-4 h-4" /> Dar Assinatura ({selectedUsers.size})
              </Button>
              <Button size="sm" variant="outline" className="gap-1 border-[hsl(280,70%,55%)]/30 text-[hsl(280,70%,55%)] hover:bg-[hsl(280,70%,55%)]/10" onClick={() => setShowTrialDialog(true)}>
                <Star className="w-4 h-4" /> Premium Teste ({selectedUsers.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search + Select All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou ID..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedUsers.size === filtered.length ? "Desmarcar" : "Selecionar Todos"}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const isSelected = selectedUsers.has(s.user_id);
            const daysLeft = s.expire_date ? Math.max(0, Math.ceil((new Date(s.expire_date).getTime() - Date.now()) / 86400000)) : null;
            const isExpired = s.expire_date && new Date(s.expire_date) < new Date();

            return (
              <Card key={s.id} className={`glass-card transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "hover:border-primary/20"}`}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => {
                      setSelectedUsers(prev => {
                        const next = new Set(prev);
                        if (next.has(s.user_id)) next.delete(s.user_id);
                        else next.add(s.user_id);
                        return next;
                      });
                    }} />
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.userName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{s.user_id.slice(0, 12)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[11px] ${PLAN_COLORS[s.plan] || PLAN_COLORS.gratuito}`}>
                      {s.plan === "premium_teste" && <Star className="w-3 h-3 mr-1" />}
                      {PLAN_LABELS[s.plan] || s.plan}
                    </Badge>
                    <span className={`text-xs font-medium ${STATUS_COLORS[s.status] || ""}`}>
                      {s.status === "active" ? "● Ativo" : s.status === "blocked" ? "● Bloqueado" : "● Inativo"}
                    </span>
                    {daysLeft !== null && !isExpired && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {daysLeft}d
                      </span>
                    )}
                    {isExpired && <Badge className="bg-destructive/10 text-destructive text-[10px]">Expirado</Badge>}
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}>
                      <Calendar className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma assinatura encontrada.</p>}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Assinatura - {editSub?.userName}</DialogTitle>
            <DialogDescription>Altere o plano, status e data de expiração.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gratuito">Gratuito</SelectItem>
                  <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                  <SelectItem value="premium_anual">Premium Anual</SelectItem>
                  <SelectItem value="premium_teste">Premium Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Expiração</Label>
              <Input type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} />
            </div>
            <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Subscription Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Dar Assinatura Premium
            </DialogTitle>
            <DialogDescription>Conceder acesso premium para os usuários selecionados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium">{selectedUsers.size} usuário(s) selecionado(s)</p>
            </div>
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
                  {DURATION_PRESETS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantSubscription} disabled={granting} className="w-full gradient-primary text-primary-foreground">
              {granting ? "Processando..." : "Conceder Assinatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Teste Dialog */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Star className="w-5 h-5 text-[hsl(280,70%,55%)]" /> Premium Teste
            </DialogTitle>
            <DialogDescription>Conceder acesso Premium Teste temporário. O usuário terá acesso completo a todos os recursos premium durante o período.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[hsl(280,70%,55%)]/5 border border-[hsl(280,70%,55%)]/10">
              <p className="text-sm font-medium">{selectedUsers.size} usuário(s) selecionado(s)</p>
              <p className="text-xs text-muted-foreground mt-1">Acesso completo: IA, Simulados, Plano de Estudos, Aulas Premium</p>
            </div>
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
            <Button onClick={grantTrial} disabled={granting} className="w-full bg-[hsl(280,70%,55%)] text-white hover:bg-[hsl(280,70%,50%)]">
              {granting ? "Processando..." : "Conceder Premium Teste"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
