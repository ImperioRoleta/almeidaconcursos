import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Shield, Search, Ban, CheckCircle, Crown, User, Gift, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function AdminUsuarios() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [grantPlan, setGrantPlan] = useState("premium_mensal");
  const [grantDays, setGrantDays] = useState("30");
  const [trialDays, setTrialDays] = useState("7");
  const [granting, setGranting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch separately due to no FK relationships
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

    const merged = profiles.map(p => ({
      ...p,
      subscription: subsMap[p.user_id] || null,
      roles: rolesMap[p.user_id] || [],
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleBlock = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "blocked" ? "active" : "blocked";
    const { error } = await supabase.from("subscriptions").update({ status: newStatus }).eq("user_id", userId);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(newStatus === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado");
    fetchUsers();
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === filtered.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered.map(u => u.user_id)));
    }
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
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
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
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q);
  });

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", trial: "Teste Grátis",
  };
  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/10 text-primary border-primary/30",
    premium_anual: "bg-accent/10 text-accent border-accent/30",
    trial: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/30",
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
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowTrialDialog(true)}>
                <Gift className="w-4 h-4" /> Teste Gratuito
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedUsers.size === filtered.length ? "Desmarcar Todos" : "Selecionar Todos"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const plan = u.subscription?.plan || "gratuito";
            const status = u.subscription?.status || "active";
            const isAdmin = u.roles?.some((r: any) => r.role === "admin");
            const isSelected = selectedUsers.has(u.user_id);
            const expireDate = u.subscription?.expire_date;
            const daysLeft = expireDate ? Math.max(0, Math.ceil((new Date(expireDate).getTime() - Date.now()) / 86400000)) : null;

            return (
              <Card key={u.id} className={`glass-card transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "hover:border-primary/20"} ${status === "blocked" ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectUser(u.user_id)} />
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? "bg-accent/10" : "bg-primary/10"}`}>
                      {isAdmin ? <Shield className="w-4 h-4 text-accent" /> : <User className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-sm truncate">{u.name || "Sem nome"}</p>
                        {isAdmin && <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">Admin</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">{u.user_id.slice(0, 12)}...</p>
                    </div>
                  </div>

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
                    <Button
                      variant={status === "blocked" ? "default" : "destructive"}
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => toggleBlock(u.user_id, status)}
                    >
                      {status === "blocked" ? <><CheckCircle className="w-3 h-3" /> Desbloquear</> : <><Ban className="w-3 h-3" /> Bloquear</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>}
        </div>
      )}

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
            <Button onClick={grantSubscription} disabled={granting} className="w-full gradient-primary text-primary-foreground">
              {granting ? "Processando..." : `Conceder para ${selectedUsers.size} usuário(s)`}
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
            <p className="text-sm text-muted-foreground">
              Conceder teste gratuito para <span className="font-semibold text-foreground">{selectedUsers.size}</span> usuário(s)
            </p>
            <div className="space-y-2">
              <Label>Duração do Teste</Label>
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
              {granting ? "Processando..." : `Conceder teste para ${selectedUsers.size} usuário(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
