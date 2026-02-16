import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Save, CreditCard, RefreshCw, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminPagamentos() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [settingsRes, allReqRes] = await Promise.all([
      supabase.from("platform_settings").select("*"),
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const map: Record<string, string> = {};
    settingsRes.data?.forEach((s: any) => { map[s.key] = s.value; });
    setSettings(map);

    const allReqs = allReqRes.data ?? [];
    const userIds = [...new Set(allReqs.map(r => r.user_id))];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.name; });
      setAllRequests(allReqs.map(r => ({ ...r, userName: profileMap[r.user_id] || "Sem nome" })));
    } else {
      setAllRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("platform_settings").upsert({ key, value, updated_at: new Date().toISOString(), label: key, category: "payments" }, { onConflict: "key" });
    }
    toast.success("Configurações salvas!");
    setSaving(false);
  };

  const planLabels: Record<string, string> = { premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", gratuito: "Gratuito" };
  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-[hsl(38,92%,50%)]" />,
    approved: <CheckCircle className="w-4 h-4 text-[hsl(142,71%,45%)]" />,
    rejected: <XCircle className="w-4 h-4 text-destructive" />,
  };
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]" },
    approved: { label: "Aprovado", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" },
    rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  };

  const approvedCount = allRequests.filter(r => r.status === "approved").length;
  const totalRevenue = allRequests.filter(r => r.status === "approved" && r.amount).reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Pagamentos
          </h1>
          <p className="text-muted-foreground text-sm">Mercado Pago integrado • Ativação automática</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar Preços"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Transações</p>
              <p className="text-xl font-heading font-bold font-mono">{allRequests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[hsl(142,71%,45%)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aprovados</p>
              <p className="text-xl font-heading font-bold font-mono">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="text-xl font-heading font-bold font-mono">R$ {totalRevenue.toFixed(2).replace(".", ",")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prices config */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Preços dos Planos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-sm">Preço Mensal (R$)</Label>
            <Input value={settings.plan_price_mensal || ""} onChange={e => updateSetting("plan_price_mensal", e.target.value)} placeholder="39,90" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Preço Anual/mês (R$)</Label>
            <Input value={settings.plan_price_anual || ""} onChange={e => updateSetting("plan_price_anual", e.target.value)} placeholder="29,90" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Preço Anual Total (R$)</Label>
            <Input value={settings.plan_price_anual_total || ""} onChange={e => updateSetting("plan_price_anual_total", e.target.value)} placeholder="358,80" />
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            <span>Histórico de Transações</span>
            <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {allRequests.map(req => {
                const st = statusLabels[req.status] || statusLabels.pending;
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      {statusIcons[req.status]}
                      <div>
                        <p className="text-sm font-medium">{req.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {planLabels[req.plan] || req.plan}
                          {req.amount && ` • R$ ${Number(req.amount).toFixed(2)}`}
                          {` • ${new Date(req.created_at).toLocaleDateString("pt-BR")}`}
                          {req.mp_payment_id && ` • MP #${req.mp_payment_id}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={st.color}>{st.label}</Badge>
                  </div>
                );
              })}
              {allRequests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação ainda</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
