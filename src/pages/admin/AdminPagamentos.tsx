import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, DollarSign, Save, CreditCard, MessageSquare, Link2, QrCode, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminPagamentos() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [checkingExpired, setCheckingExpired] = useState(false);

  const loadData = async () => {
    const [settingsRes, requestsRes, allReqRes] = await Promise.all([
      supabase.from("platform_settings").select("*"),
      supabase.from("payment_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    const map: Record<string, string> = {};
    settingsRes.data?.forEach((s: any) => { map[s.key] = s.value; });
    setSettings(map);

    // Get profiles for names
    const requests = requestsRes.data ?? [];
    const allReqs = allReqRes.data ?? [];
    const allUserIds = [...new Set([...requests, ...allReqs].map(r => r.user_id))];

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", allUserIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.name; });
      setPendingRequests(requests.map(r => ({ ...r, userName: profileMap[r.user_id] || "Sem nome" })));
      setAllRequests(allReqs.map(r => ({ ...r, userName: profileMap[r.user_id] || "Sem nome" })));
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("platform_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    }
    toast.success("Configurações salvas!");
    setSaving(false);
  };

  const approveRequest = async (req: any) => {
    await supabase.from("payment_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    const daysToAdd = req.plan === "premium_anual" ? 365 : 30;
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + daysToAdd);
    await supabase.from("subscriptions").update({
      plan: req.plan, status: "active", expire_date: expireDate.toISOString(), start_date: new Date().toISOString(),
    }).eq("user_id", req.user_id);
    toast.success(`Assinatura de ${req.userName} aprovada!`);
    loadData();
  };

  const rejectRequest = async (req: any) => {
    await supabase.from("payment_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    toast.success("Solicitação rejeitada.");
    loadData();
  };

  const runExpiredCheck = async () => {
    setCheckingExpired(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-expired-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const data = await res.json();
      toast.success(`Verificação concluída. ${data.expired_count || 0} assinaturas expiradas.`);
    } catch {
      toast.error("Erro ao verificar expiradas");
    }
    setCheckingExpired(false);
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

  const settingsGroups = [
    { title: "Configurações PIX", icon: QrCode, fields: [
      { key: "mp_pix_key", label: "Chave PIX", placeholder: "CPF, e-mail ou chave aleatória" },
      { key: "mp_pix_name", label: "Nome do titular", placeholder: "Nome que aparece no PIX" },
    ]},
    { title: "Links de Pagamento", icon: Link2, fields: [
      { key: "mp_payment_link_mensal", label: "Link - Plano Mensal", placeholder: "https://mpago.la/..." },
      { key: "mp_payment_link_anual", label: "Link - Plano Anual", placeholder: "https://mpago.la/..." },
    ]},
    { title: "Contato & Suporte", icon: MessageSquare, fields: [
      { key: "mp_whatsapp", label: "WhatsApp", placeholder: "(71) 99999-9999" },
    ]},
    { title: "Preços dos Planos", icon: DollarSign, fields: [
      { key: "plan_price_mensal", label: "Preço Mensal (R$)", placeholder: "39.90" },
      { key: "plan_price_anual", label: "Preço Anual por mês (R$)", placeholder: "29.90" },
      { key: "plan_price_anual_total", label: "Preço Anual total (R$)", placeholder: "358.80" },
    ]},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Configuração de Pagamentos
          </h1>
          <p className="text-muted-foreground text-sm">Mercado Pago integrado • Ativação automática de assinaturas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runExpiredCheck} disabled={checkingExpired}>
            <RefreshCw className={`w-4 h-4 mr-2 ${checkingExpired ? "animate-spin" : ""}`} />
            {checkingExpired ? "Verificando..." : "Verificar Expiradas"}
          </Button>
          <Button onClick={saveSettings} disabled={saving} className="gradient-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar Tudo"}
          </Button>
        </div>
      </div>

      {/* Info badge */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Integração Mercado Pago Ativa</p>
            <p className="text-xs text-muted-foreground">Pagamentos são processados automaticamente. Quando o aluno paga, o acesso é liberado instantaneamente via webhook.</p>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <Card className="glass-card border-accent/30">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Solicitações Pendentes
              <Badge className="bg-accent/10 text-accent border-accent/20 ml-2">{pendingRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <p className="font-medium">{req.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {planLabels[req.plan] || req.plan}
                    {req.amount && ` • R$ ${Number(req.amount).toFixed(2)}`}
                    {` • ${new Date(req.created_at).toLocaleDateString("pt-BR")}`}
                  </p>
                  {req.mp_payment_id && <p className="text-xs text-primary mt-0.5">MP #{req.mp_payment_id}</p>}
                  {req.mp_status && <Badge className="text-[10px] mt-1 bg-muted">{req.mp_status}</Badge>}
                  {req.proof_info && <p className="text-xs text-muted-foreground mt-1">📎 {req.proof_info}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => approveRequest(req)}>Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => rejectRequest(req)}>Rejeitar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Instruções para o aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.mp_instructions || ""}
            onChange={e => updateSetting("mp_instructions", e.target.value)}
            placeholder="Instruções que o aluno verá ao solicitar upgrade..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Settings groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsGroups.map((group, i) => (
          <Card key={i} className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <group.icon className="w-5 h-5 text-primary" /> {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-sm">{field.label}</Label>
                  <Input
                    value={settings[field.key] || ""}
                    onChange={e => updateSetting(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
