import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Crown, CheckCircle, Clock, Loader2, ExternalLink, ShieldCheck, Sparkles,
  TicketPercent, X, Tag, ArrowRight, ShoppingCart, AlertTriangle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const EXPIRATION_MINUTES = 30;


interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  description: string | null;
}

export default function Assinatura() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<any>(null);
  const [checkoutTimeLeft, setCheckoutTimeLeft] = useState(0);
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

      // Find pending checkout within 30 min
      const pending = reqRes.data?.find((r: any) => {
        if (r.status !== "pending") return false;
        const created = new Date(r.created_at).getTime();
        const expiresAt = created + EXPIRATION_MINUTES * 60 * 1000;
        return expiresAt > Date.now();
      });
      if (pending) {
        setPendingCheckout(pending);
        const created = new Date(pending.created_at).getTime();
        const remaining = created + EXPIRATION_MINUTES * 60 * 1000 - Date.now();
        setCheckoutTimeLeft(Math.floor(remaining / 1000));
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "approved") toast.success("Pagamento aprovado! Seu acesso premium foi ativado.");
    else if (status === "pending") toast.info("Pagamento pendente. Seu acesso será liberado assim que confirmado.");
    else if (status === "rejected") toast.error("Pagamento não aprovado. Tente novamente.");
  }, [searchParams]);

  // Checkout countdown
  useEffect(() => {
    if (checkoutTimeLeft <= 0 || !pendingCheckout) return;
    const interval = setInterval(() => {
      setCheckoutTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); setPendingCheckout(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingCheckout, checkoutTimeLeft]);

  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const isPremium = subscription?.plan !== "gratuito" && subscription?.plan !== "premium_teste" && subscription?.plan !== "trial" && subscription?.status === "active" && !isExpired;
  const isTrialPlan = (subscription?.plan === "premium_teste" || subscription?.plan === "trial") && subscription?.status === "active" && !isExpired;
  const hasAccess = isPremium || isTrialPlan;
  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Coupon validation
  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Cupom inválido ou não encontrado");
        setCouponLoading(false);
        return;
      }

      // Check expiration
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast.error("Este cupom já expirou");
        setCouponLoading(false);
        return;
      }

      // Check uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast.error("Este cupom já atingiu o limite de usos");
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        description: data.description,
      });
      toast.success(`Cupom "${data.code}" aplicado!`);
    } catch {
      toast.error("Erro ao validar cupom");
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const calcDiscount = (originalPrice: number): { final: number; saved: number } => {
    if (!appliedCoupon) return { final: originalPrice, saved: 0 };
    let discount = 0;
    if (appliedCoupon.discount_type === "percentage") {
      discount = originalPrice * (appliedCoupon.discount_value / 100);
    } else {
      discount = appliedCoupon.discount_value;
    }
    const final = Math.max(0, originalPrice - discount);
    return { final: Math.round(final * 100) / 100, saved: Math.round(discount * 100) / 100 };
  };

  const handleCheckout = async (plan: string) => {
    if (!user) return;
    setLoadingPlan(plan);
    try {
      const body: any = { plan };
      if (appliedCoupon) body.coupon_code = appliedCoupon.code;

      const { data, error } = await supabase.functions.invoke("mp-create-preference", {
        body,
      });

      if (error) throw new Error(error.message || "Erro ao criar pagamento");
      if (data?.error) throw new Error(data.error);
      if (!data?.init_point) throw new Error("Resposta inválida do servidor");
      
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

  const basePriceMonthly = parseFloat((settings.plan_price_mensal || "39,90").replace(",", "."));
  const basePriceAnnualTotal = parseFloat((settings.plan_price_anual_total || "358,80").replace(",", "."));
  const basePriceAnnualMonthly = parseFloat((settings.plan_price_anual || "29,90").replace(",", "."));

  const monthlyDiscount = calcDiscount(basePriceMonthly);
  const annualDiscount = calcDiscount(basePriceAnnualTotal);

  const plans = [
    {
      key: "premium_mensal",
      name: "Premium Mensal",
      originalPrice: basePriceMonthly,
      finalPrice: monthlyDiscount.final,
      saved: monthlyDiscount.saved,
      period: "/mês",
      features: ["Todas as aulas", "Questões ilimitadas", "Simulados ilimitados", "IA completa", "Plano de estudos IA"],
      highlight: true,
    },
    {
      key: "premium_anual",
      name: "Premium Anual",
      originalPrice: basePriceAnnualTotal,
      finalPrice: annualDiscount.final,
      saved: annualDiscount.saved,
      period: "/ano",
      subtitle: `≈ R$ ${(annualDiscount.final / 12).toFixed(2).replace(".", ",")}/mês`,
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

      {/* Pending checkout banner */}
      {pendingCheckout && checkoutTimeLeft > 0 && !hasAccess && (
        <Card className={`border-2 ${checkoutTimeLeft < 300 ? "border-destructive/40 bg-destructive/5" : "border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/5"}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${checkoutTimeLeft < 300 ? "bg-destructive/10" : "bg-[hsl(38,92%,50%)]/10"}`}>
                <ShoppingCart className={`w-6 h-6 ${checkoutTimeLeft < 300 ? "text-destructive" : "text-[hsl(38,92%,50%)]"}`} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-base">Compra pendente</h3>
                    <p className="text-sm text-muted-foreground">
                      {planLabels[pendingCheckout.plan] || pendingCheckout.plan} — R$ {Number(pendingCheckout.amount).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkoutTimeLeft < 300 && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                    <Badge variant="outline" className={`font-mono text-sm px-3 py-1 ${checkoutTimeLeft < 300 ? "border-destructive/30 text-destructive" : "border-[hsl(38,92%,50%)]/30 text-[hsl(38,92%,50%)]"}`}>
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {String(Math.floor(checkoutTimeLeft / 60)).padStart(2, "0")}:{String(checkoutTimeLeft % 60).padStart(2, "0")}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gradient-primary text-primary-foreground"
                    onClick={() => handleCheckout(pendingCheckout.plan)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-1" />}
                    Finalizar Pagamento
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Esta oferta expira em {Math.floor(checkoutTimeLeft / 60)} minutos. Após isso, será necessário iniciar uma nova compra.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade plans */}
      {!hasAccess && (
        <>
          {/* Coupon input */}
          <Card className="glass-card border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TicketPercent className="w-5 h-5 text-accent" />
                <h3 className="font-heading font-semibold text-sm">Tem um cupom de desconto?</h3>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-[hsl(142,71%,45%)]/5 border border-[hsl(142,71%,45%)]/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[hsl(142,71%,45%)]" />
                    <div>
                      <span className="font-mono font-bold text-sm">{appliedCoupon.code}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {appliedCoupon.discount_type === "percentage"
                          ? `${appliedCoupon.discount_value}% de desconto`
                          : `R$ ${appliedCoupon.discount_value.toFixed(2)} de desconto`}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO DO CUPOM"
                    className="font-mono uppercase"
                    onKeyDown={e => e.key === "Enter" && validateCoupon()}
                  />
                  <Button variant="outline" onClick={validateCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-heading font-extrabold text-3xl">
                        R$ {plan.finalPrice.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.saved > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {plan.originalPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <Badge className="bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] text-[10px]">
                          <Tag className="w-3 h-3 mr-0.5" /> -R$ {plan.saved.toFixed(2).replace(".", ",")}
                        </Badge>
                      </div>
                    )}
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
