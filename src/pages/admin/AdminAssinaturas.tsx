import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Crown, Search, Calendar, User, Clock, Gift, Zap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminAssinaturas() {
  const { user: adminUser } = useAuth();
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
    const { error } = await supabase.from("subscriptions").update({
      plan: editPlan,
      status: editStatus,
      expire_date: expireDate ? new Date(expireDate).toISOString() : null,
    }).eq("id", editSub.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Assinatura atualizada!");
    setEditSub(null);
    fetchSubs();
  };

  const grantSubscription = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
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
    }
  };

  const grantTrial = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
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
      toast.success(`Teste gratuito concedido para ${result.updated} usuário(s)!`);
      setShowTrialDialog(false);
      setSelectedUsers(new Set());
      fetchSubs();
    }
  };

  const runExpiredCheck = async () => {
    setCheckingExpired(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-expired-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const data = await res.json();
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

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", trial: "Teste Grátis",
  };
  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/10 text-primary",
    premium_anual: "bg-accent/10 text-accent",
    trial: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]",
  };
  const statusColors: Record<string, string> = {
    active: "text-[hsl(142,71%,45%)]",
    blocked: "text-destructive",
    inactive: "text-muted-foreground",
  };

  const durationPresets = [
    { label: "7 dias", value: "7" }, { label: "15 dias", value: "15" },
    { label: "30 dias", value: "30" }, { label: "90 dias", value: "90" },
    { label: "180 dias", value: "180" }, { label: "365 dias", value: "365" },
  ];

  const premiumCount = subs.filter(s => s.plan !== "gratuito" && s.plan !== "trial" && s.status === "active").length;
  const trialCount = subs.filter(s => s.plan === "trial" && s.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-accent" /> Gestão de Assinaturas
          </h1>
          <p className="text-muted-foreground text-sm">{subs.length} total • {premiumCount} premium • {trialCount} trial</p>
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
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowTrialDialog(true)}>
                <Gift className="w-4 h-4" /> Teste Grátis ({selectedUsers.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedUsers.size === filtered.length ? "Desmarcar" : "Selecionar Todos"}
        </Button>
      </div>

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
                    <Badge className={`text-[11px] ${planColors[s.plan] || ""}`}>{planLabels[s.plan] || s.plan}</Badge>
                    <span className={`text-xs font-medium ${statusColors[s.status] || ""}`}>
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
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Assinatura - {editSub?.userName}</DialogTitle>
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
                  <SelectItem value="trial">Teste Grátis</SelectItem>
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
            <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Salvar</Button>
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
            <p className="text-sm text-muted-foreground">{selectedUsers.size} usuário(s) selecionado(s)</p>
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
                  {durationPresets.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantSubscription} disabled={granting} className="w-full gradient-primary text-primary-foreground">
              {granting ? "Processando..." : "Conceder Assinatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Free Trial Dialog */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Gift className="w-5 h-5 text-[hsl(142,71%,45%)]" /> Teste Gratuito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selectedUsers.size} usuário(s) selecionado(s)</p>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantTrial} disabled={granting} className="w-full bg-[hsl(142,71%,45%)] text-background hover:bg-[hsl(142,71%,40%)]">
              {granting ? "Processando..." : "Conceder Teste Gratuito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
