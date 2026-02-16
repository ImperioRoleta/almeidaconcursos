import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, CheckCircle, ChevronRight, Clock, Loader2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Assinatura() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [subRes, settingsRes, reqRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase.from("platform_settings").select("*"),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setSubscription(subRes.data);
      const map: Record<string, string> = {};
      settingsRes.data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setMyRequests(reqRes.data ?? []);
    };
    load();
  }, [user]);

  // Handle return from Mercado Pago
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "approved") {
      toast.success("Pagamento aprovado! Seu acesso premium foi ativado.");
    } else if (status === "pending") {
      toast.info("Pagamento pendente. Seu acesso será liberado assim que confirmado.");
    } else if (status === "rejected") {
      toast.error("Pagamento não aprovado. Tente novamente.");
    }
  }, [searchParams]);

  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const isPremium = subscription?.plan !== "gratuito" && subscription?.plan !== "premium_teste" && subscription?.plan !== "trial" && subscription?.status === "active" && !isExpired;
  const isTrialPlan = (subscription?.plan === "premium_teste" || subscription?.plan === "trial") && subscription?.status === "active" && !isExpired;
  const hasAccess = isPremium || isTrialPlan;
  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleCheckout = async (plan: string) => {
    if (!user) return;
    setLoadingPlan(plan);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(`${VITE_SUPABASE_URL}/functions/v1/mp-create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar pagamento");

      // Redirect to Mercado Pago checkout
      window.location.href = data.init_point;
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setLoadingPlan(null);
    }
  };

  const planLabels: Record<string, string> = { gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", premium_teste: "Premium Teste", trial: "Premium Teste" };
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
      <Card className={`glass-card ${hasAccess ? "border-accent/30" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${hasAccess ? "gradient-gold" : "bg-muted"}`}>
                <Crown className={`w-7 h-7 ${hasAccess ? "text-background" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">{planLabels[subscription?.plan] || "Gratuito"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {hasAccess ? (
                    <Badge className={isTrialPlan ? "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)]" : "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]"}>
                      ● {isTrialPlan ? "Premium Teste Ativo" : "Ativo"}
                    </Badge>
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
      {!hasAccess && (
        <>
          <h2 className="font-heading font-semibold text-lg">Faça upgrade para Premium</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <Card key={plan.key} className={`glass-card-hover cursor-pointer transition-all relative ${plan.highlight ? "border-primary/30" : ""}`}>
                {plan.badge && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">{plan.badge}</Badge>
                  </div>
                )}
                <CardContent className="p-6 space-y-4">
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
                  <Button
                    className={`w-full ${plan.highlight ? "gradient-primary text-primary-foreground" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={!!loadingPlan}
                    onClick={() => handleCheckout(plan.key)}
                  >
                    {loadingPlan === plan.key ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                    ) : (
                      <><ExternalLink className="w-4 h-4 mr-2" /> Assinar com Mercado Pago</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Pagamento seguro via Mercado Pago • Ativação automática</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
        </>
      )}

      {/* Payment history */}
      {myRequests.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map(req => {
              const st = statusLabels[req.status] || statusLabels.pending;
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div>
                    <span className="text-sm font-medium">{planLabels[req.plan] || req.plan}</span>
                    {req.amount && <span className="text-xs text-muted-foreground ml-2">R$ {Number(req.amount).toFixed(2)}</span>}
                    <span className="text-xs text-muted-foreground ml-2">{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <Badge className={st.color}>{st.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
