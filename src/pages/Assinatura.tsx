import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, CheckCircle, Star, Zap, ChevronRight, Clock, QrCode, MessageSquare, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Assinatura() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [proofInfo, setProofInfo] = useState("");
  const [sending, setSending] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [subRes, settingsRes, reqRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase.from("platform_settings").select("*"),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setSubscription(subRes.data);
      const map: Record<string, string> = {};
      settingsRes.data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setMyRequests(reqRes.data ?? []);
    };
    fetch();
  }, [user]);

  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const isPremium = subscription?.plan !== "gratuito" && subscription?.status === "active" && !isExpired;
  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const submitRequest = async () => {
    if (!user || !selectedPlan) return;
    setSending(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan: selectedPlan,
      proof_info: proofInfo || null,
    });
    setSending(false);
    if (error) { toast.error("Erro ao enviar solicitação"); return; }
    toast.success("Solicitação enviada! Aguarde a aprovação do administrador.");
    setSelectedPlan(null);
    setProofInfo("");
    // Refresh requests
    const { data } = await supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    setMyRequests(data ?? []);
  };

  const copyPix = () => {
    if (settings.mp_pix_key) {
      navigator.clipboard.writeText(settings.mp_pix_key);
      toast.success("Chave PIX copiada!");
    }
  };

  const planLabels: Record<string, string> = { gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual" };
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando", color: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]" },
    approved: { label: "Aprovado", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" },
    rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  };

  const plans = [
    {
      key: "premium_mensal",
      name: "Premium Mensal",
      price: settings.plan_price_mensal || "39,90",
      period: "/mês",
      features: ["Todas as aulas", "Questões ilimitadas", "Simulados ilimitados", "IA completa", "Plano de estudos IA"],
      highlight: true,
    },
    {
      key: "premium_anual",
      name: "Premium Anual",
      price: settings.plan_price_anual || "29,90",
      period: "/mês",
      subtitle: `Total: R$ ${settings.plan_price_anual_total || "358,80"}/ano`,
      features: ["Tudo do Mensal", "Economia de 25%", "Acesso antecipado", "Certificado", "Grupo exclusivo"],
      highlight: false,
      badge: "Melhor custo",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-accent" /> Minha Assinatura
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie seu plano e acesso à plataforma</p>
      </div>

      {/* Current plan */}
      <Card className={`glass-card ${isPremium ? "border-accent/30" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isPremium ? "gradient-gold" : "bg-muted"}`}>
                <Crown className={`w-7 h-7 ${isPremium ? "text-background" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">{planLabels[subscription?.plan] || "Gratuito"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {isPremium ? (
                    <Badge className="bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]">● Ativo</Badge>
                  ) : isExpired ? (
                    <Badge className="bg-destructive/10 text-destructive">● Expirado</Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground">Plano básico</Badge>
                  )}
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {daysLeft} dias restantes
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade plans */}
      {!isPremium && (
        <>
          <h2 className="font-heading font-semibold text-lg">Faça upgrade para Premium</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <Card key={plan.key} className={`glass-card-hover cursor-pointer transition-all ${plan.highlight ? "border-primary/30" : ""}`} onClick={() => setSelectedPlan(plan.key)}>
                {plan.badge && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">{plan.badge}</Badge>
                  </div>
                )}
                <CardContent className="p-6 space-y-4 relative">
                  <div>
                    <h3 className="font-heading font-bold text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-heading font-extrabold text-3xl">R$ {plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.subtitle && <p className="text-xs text-muted-foreground mt-1">{plan.subtitle}</p>}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.highlight ? "gradient-primary text-primary-foreground" : ""}`} variant={plan.highlight ? "default" : "outline"}>
                    Assinar <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Previous requests */}
      {myRequests.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Minhas Solicitações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map(req => {
              const st = statusLabels[req.status] || statusLabels.pending;
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div>
                    <span className="text-sm font-medium">{planLabels[req.plan] || req.plan}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <Badge className={st.color}>{st.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Payment dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Assinar {planLabels[selectedPlan || ""] || ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* PIX info */}
            {settings.mp_pix_key && (
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span className="font-heading font-semibold">Pagamento via PIX</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted p-2 rounded font-mono">{settings.mp_pix_key}</code>
                    <Button size="sm" variant="outline" onClick={copyPix}><Copy className="w-4 h-4" /></Button>
                  </div>
                  {settings.mp_pix_name && <p className="text-xs text-muted-foreground">Titular: {settings.mp_pix_name}</p>}
                </CardContent>
              </Card>
            )}

            {/* Payment link */}
            {(selectedPlan === "premium_mensal" && settings.mp_payment_link_mensal) && (
              <a href={settings.mp_payment_link_mensal} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gradient-primary text-primary-foreground gap-2">
                  <ExternalLink className="w-4 h-4" /> Pagar via Mercado Pago
                </Button>
              </a>
            )}
            {(selectedPlan === "premium_anual" && settings.mp_payment_link_anual) && (
              <a href={settings.mp_payment_link_anual} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gradient-primary text-primary-foreground gap-2">
                  <ExternalLink className="w-4 h-4" /> Pagar via Mercado Pago
                </Button>
              </a>
            )}

            {/* WhatsApp */}
            {settings.mp_whatsapp && (
              <a href={`https://wa.me/${settings.mp_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2 mt-2">
                  <MessageSquare className="w-4 h-4" /> WhatsApp: {settings.mp_whatsapp}
                </Button>
              </a>
            )}

            {/* Instructions */}
            {settings.mp_instructions && (
              <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">{settings.mp_instructions}</p>
            )}

            {/* Proof */}
            <div className="space-y-2">
              <Label>Informações do comprovante (opcional)</Label>
              <Textarea value={proofInfo} onChange={e => setProofInfo(e.target.value)} placeholder="Código da transação, nome do pagador, etc." rows={2} />
            </div>

            <Button onClick={submitRequest} disabled={sending} className="w-full gradient-primary text-primary-foreground">
              {sending ? "Enviando..." : "Confirmar Solicitação"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">Seu acesso será liberado após confirmação do pagamento pelo administrador.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
