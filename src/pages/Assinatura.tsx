/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

const EXPIRATION_MINUTES = 30;

interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  description: string | null;
  applicable_plans?: string[];
}

export default function Assinatura() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [activePlans, setActivePlans] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Payment Method state
  const [pixData, setPixData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Coupon state & Pending Checkout
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<any>(null);
  const [checkoutTimeLeft, setCheckoutTimeLeft] = useState(0);

  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [subRes, plansRes, reqRes] = await Promise.all([
          supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("plans").select("*").eq("is_active", true).order("order_index"),
          supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        ]);

        setSubscription(subRes.data);
        setActivePlans(plansRes.data || []);
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
      } catch (err) {
        console.error("Erro ao carregar dados de assinatura:", err);
      }
    };
    load();
  }, [user]);

  // Handle URL status params
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

  // Realtime Payment Listener
  useEffect(() => {
    if (!pendingCheckout?.id && !pixData?.payment_request_id) return;

    const targetId = pendingCheckout?.id || pixData?.payment_request_id;
    console.log("Monitorando pagamento ID:", targetId);

    const channel = supabase
      .channel(`payment_${targetId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_requests',
          filter: `id=eq.${targetId}`,
        },
        (payload: any) => {
          console.log("Atualização de pagamento recebida:", payload);
          if (payload.new.status === 'approved') {
            setShowSuccessModal(true);
            setPixData(null);
            toast.success("Pagamento confirmado!");
            setTimeout(() => window.location.reload(), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingCheckout, pixData]);

  const handlePixCheckout = async (plan: string) => {
    if (!user) return;
    setLoadingPlan(plan);
    setPixData(null);
    try {
      const body: any = { plan };
      if (appliedCoupon) body.coupon_code = appliedCoupon.code;

      const { data, error } = await supabase.functions.invoke("mp-create-pix", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixData(data);
      toast.success("QR Code Pix gerado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar Pix");
    } finally {
      setLoadingPlan(null);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      console.log("Validando cupom:", couponCode);
      const { data, error } = await supabase.functions.invoke("check-coupon", {
        body: { code: couponCode.trim() }
      });

      console.log("Resposta do servidor:", data);

      if (error) throw error;

      if (!data.valid) {
        throw new Error(data.message || "Cupom inválido");
      }

      setAppliedCoupon({
        code: data.code || couponCode.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        description: data.description,
        applicable_plans: data.applicable_plans || []
      });
      toast.success("Cupom aplicado!");
    } catch (err: any) {
      console.error("Erro validação cupom:", err);
      toast.error(err.message || "Erro ao validar cupom");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleCheckout = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const body: any = { plan: planKey };
      if (appliedCoupon) body.coupon_code = appliedCoupon.code;

      const { data, error } = await supabase.functions.invoke("mp-create-preference", { body });
      if (error) throw error;
      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("Erro ao iniciar pagamento");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Computed state
  const hasAccess = (subscription?.status === 'active' || subscription?.status === 'trialing') && subscription?.plan !== 'gratuito';

  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const statusLabels: Record<string, { label: string; color: string }> = {
    approved: { label: "Aprovado", color: "bg-green-500/10 text-green-500" },
    pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-500" },
    rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
    cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
  };

  const plans = (activePlans || []).map(p => {
    if (!p) return null;
    const originalPrice = Number(p.original_price || p.price || 0);
    let finalPrice = Number(p.price || 0);
    let saved = 0;

    const promoPlans = appliedCoupon?.applicable_plans || [];
    const isCouponApplicable = !appliedCoupon || promoPlans.length === 0 || promoPlans.some(slug => slug.toLowerCase() === (p.slug || '').toLowerCase());

    if (appliedCoupon && isCouponApplicable) {
      if (appliedCoupon.discount_type === 'percentage') {
        const discount = (finalPrice * appliedCoupon.discount_value) / 100;
        finalPrice -= discount;
        saved = discount + (originalPrice > Number(p.price) ? (originalPrice - Number(p.price)) : 0);
      } else {
        finalPrice -= appliedCoupon.discount_value;
        saved = appliedCoupon.discount_value + (originalPrice > Number(p.price) ? (originalPrice - Number(p.price)) : 0);
      }
    } else if (originalPrice > Number(p.price)) {
      saved = originalPrice - Number(p.price);
    }

    return {
      key: p.slug || 'unknown',
      name: p.name || 'Plano',
      originalPrice,
      finalPrice: Math.max(0, finalPrice),
      saved: Math.max(0, saved),
      period: p.billing_period === 'annual' ? '/ano' : '/mês',
      highlight: !!p.is_featured,
      badge: p.badge_text || null,
      subtitle: p.description,
      features: Array.isArray(p.features) ? p.features : [],
      hasDiscount: !!(appliedCoupon && isCouponApplicable),
      couponNotApplicable: !!(appliedCoupon && !isCouponApplicable)
    };
  }).filter(p => p !== null);

  if (hasAccess) {
    const currentPlan = activePlans.find(p => p.slug === subscription.plan);
    return (
      <div className="space-y-8 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </span>
              Painel do Assinante
            </h1>
            <p className="text-muted-foreground mt-1">Você faz parte da elite Almeida Concursos</p>
          </div>
          <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 text-sm">
            <ShieldCheck className="w-4 h-4 mr-2" /> Assinatura Ativa
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Info Card */}
          <Card className="glass-card border-accent/20 lg:col-span-2 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Crown className="w-32 h-32 rotate-12" />
            </div>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="text-center md:text-left space-y-2 flex-1">
                  <p className="text-xs uppercase tracking-widest text-accent font-bold">Plano Atual</p>
                  <h2 className="text-4xl font-black">
                    {currentPlan?.name ||
                      (subscription.plan === 'premium_teste' ? 'Premium Teste' :
                        subscription.plan === 'premium_mensal' ? 'Premium Mensal' :
                          subscription.plan === 'premium_anual' ? 'Premium Anual' : subscription.plan)}
                  </h2>
                  <p className="text-muted-foreground max-w-sm">Seu acesso expira em <span className="text-foreground font-bold">{daysLeft} dias</span> ({new Date(subscription.expire_date).toLocaleDateString()})</p>

                  <div className="pt-6 flex flex-wrap gap-4">
                    <Button onClick={() => navigate("/dashboard")} className="gradient-primary px-8 rounded-xl font-bold">Ir para o Dashboard</Button>
                    <Button variant="outline" onClick={() => window.open("https://www.mercadopago.com.br", "_blank")} className="rounded-xl border-accent/20 hover:bg-accent/5">
                      Gerenciar Pagamentos <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                <div className="w-48 h-48 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="80" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/10" />
                    <motion.circle
                      cx="96" cy="96" r="80" fill="transparent" stroke="currentColor" strokeWidth="8"
                      strokeDasharray="502"
                      initial={{ strokeDashoffset: 502 }}
                      animate={{ strokeDashoffset: 502 - (502 * Math.min(daysLeft, 365) / 365) }}
                      className="text-accent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black font-mono">{daysLeft}</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">Dias</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Quick View */}
          <Card className="glass-card flex flex-col justify-center">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">Ilimitado</p><p className="text-xs text-muted-foreground uppercase tracking-tighter">Acesso às Aulas</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-accent" /></div>
                <div><p className="text-2xl font-bold">Ilimitadas</p><p className="text-xs text-muted-foreground uppercase tracking-tighter">Questões IA</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center"><Tag className="w-5 h-5 text-purple-500" /></div>
                <div><p className="text-2xl font-bold">Habilitado</p><p className="text-xs text-muted-foreground uppercase tracking-tighter">Flashcards SRS</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Seus Benefícios Exclusivos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm"><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> Acesso total a mais de 500 aulas gravadas.</li>
                <li className="flex gap-3 text-sm"><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> Banco de questões com inteligência artificial ilimitado.</li>
                <li className="flex gap-3 text-sm"><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> Sistema de Flashcards com repetição espaçada.</li>
                <li className="flex gap-3 text-sm"><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> Cronômetro Pomodoro Pro para máxima produtividade.</li>
                <li className="flex gap-3 text-sm"><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> Ranking completo de todos os alunos da plataforma.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg">Dúvidas ou Suporte?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Precisa de ajuda com sua fatura ou quer mudar de plano? Nossa equipe está à disposição para ajudar você.</p>
              <div className="pt-2">
                <Button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold h-12 rounded-xl">
                  Falar com Suporte via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-accent" /> Minha Assinatura
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie seu plano e acesso à plataforma</p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <Card className="max-w-md w-full border-accent/50 bg-background/95 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-accent">Pagamento Confirmado!</h2>
              <p className="text-muted-foreground">Sua assinatura Premium foi ativada. Aproveite!</p>
            </div>
            <Button className="w-full gradient-primary" onClick={() => window.location.reload()}>Acessar Plataforma</Button>
          </Card>
        </div>
      )}

      {/* Payment Picker Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <Card className="max-w-sm w-full shadow-2xl glass-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-heading font-bold text-lg">Forma de Pagamento</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPaymentModal(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Button className="w-full h-16 justify-between px-4 bg-accent/10 hover:bg-accent/20 border-accent/20 text-foreground" onClick={() => { setShowPaymentModal(false); if (selectedPlanKey) handlePixCheckout(selectedPlanKey); }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                  <div className="text-left"><p className="font-bold">Via PIX</p><p className="text-xs opacity-70">Liberação instantânea</p></div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button className="w-full h-16 justify-between px-4 bg-primary/10 hover:bg-primary/20 border-primary/20 text-foreground" onClick={() => { setShowPaymentModal(false); if (selectedPlanKey) handleCheckout(selectedPlanKey); }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center"><ExternalLink className="w-5 h-5 text-white" /></div>
                  <div className="text-left"><p className="font-bold">Cartão de Crédito</p><p className="text-xs opacity-70">Parcelado via MP</p></div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pix Modal */}
      {pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="max-w-md w-full p-6 space-y-6 text-center">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Pague com Pix</h3>
              <Button variant="ghost" size="icon" onClick={() => setPixData(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Valor:</p>
              <h2 className="text-3xl font-bold text-accent">R$ {(pixData.final_price ?? 0).toFixed(2).replace('.', ',')}</h2>
            </div>
            {pixData.qr_code_base64 ? (
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Pix" className="w-48 h-48 mx-auto" />
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground">QR Code Indisponível</div>}
            <div className="space-y-2">
              <p className="text-xs opacity-70">Copie o código:</p>
              <div className="flex gap-2">
                <Input readOnly value={pixData.qr_code} className="font-mono text-xs" />
                <Button size="icon" onClick={() => { navigator.clipboard.writeText(pixData.qr_code); toast.success("Copiado!"); }}><CheckCircle className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg flex items-center gap-3 text-xs text-primary animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Aguardando confirmação...
            </div>
          </Card>
        </div>
      )}

      {/* Current Access */}
      <Card className={`glass-card ${hasAccess ? "border-accent/30" : ""}`}>
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${hasAccess ? "gradient-gold" : "bg-muted"}`}>
            <Crown className={`w-7 h-7 ${hasAccess ? "text-background" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-xl">{subscription?.plan ? (activePlans.find(p => p.slug === subscription.plan)?.name || subscription.plan) : "Plano Gratuito"}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={hasAccess ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}>
                {hasAccess ? "Acesso Premium Ativo" : "Nenhum plano ativo"}
              </Badge>
              {daysLeft > 0 && <span className="text-xs opacity-70 flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft} dias restantes</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupon Section */}
      {!hasAccess && (
        <Card className="glass-card border-accent/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><TicketPercent className="w-5 h-5 text-accent" /></div>
              <div><h3 className="font-bold">Tem um cupom?</h3><p className="text-xs opacity-70">Aplique agora para ganhar desconto</p></div>
            </div>
            <div className="flex gap-2">
              {appliedCoupon ? (
                <div className="flex-1 flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <span className="font-mono font-bold text-green-500">{appliedCoupon.code} (Aplicado)</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={removeCoupon}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <>
                  <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="CÓDIGO DO CUPOM" className="uppercase font-mono font-bold" />
                  <Button className="gradient-primary" onClick={validateCoupon} disabled={couponLoading}>{couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Listing */}
      {!hasAccess && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {plans.map(plan => (
            <Card key={plan.key} className={`glass-card-hover border-white/10 flex flex-col relative ${plan.highlight ? "ring-2 ring-accent shadow-2xl scale-[1.03]" : ""} ${plan.couponNotApplicable ? "opacity-70" : ""}`}>
              {/* Badge/Selo no topo */}
              {plan.badge && (
                <div className="gradient-gold px-4 py-1.5 text-center rounded-t-xl">
                  <span className="text-xs font-bold text-background uppercase tracking-wider">{plan.badge}</span>
                </div>
              )}
              {/* Coupon status indicator */}
              {plan.hasDiscount && (
                <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex items-center justify-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-bold text-green-500">Cupom aplicado — {appliedCoupon?.discount_type === 'percentage' ? `${appliedCoupon?.discount_value}% OFF` : `R$ ${appliedCoupon?.discount_value?.toFixed(2).replace('.', ',')} OFF`}</span>
                </div>
              )}
              {plan.couponNotApplicable && (
                <div className="bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cupom não aplicável a este plano</span>
                </div>
              )}
              <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                <div className="text-center space-y-2">
                  <h3 className="font-heading font-bold text-2xl">{plan.name}</h3>
                  <div className="flex flex-col items-center">
                    {plan.hasDiscount && <span className="text-sm line-through opacity-50">R$ {plan.originalPrice.toFixed(2).replace('.', ',')}</span>}
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm">R$</span>
                      <span className={`text-4xl font-black ${plan.hasDiscount ? "text-green-500" : ""}`}>{(plan.finalPrice ?? 0).toFixed(2).replace('.', ',')}</span>
                      <span className="text-xs opacity-70">{plan.period}</span>
                    </div>
                  </div>
                  {plan.saved > 0 && <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 mt-2">Você economiza R$ {plan.saved.toFixed(2).replace('.', ',')}</Badge>}
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.slice(0, 5).map((f: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm opacity-80"><CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>

                <Button className={`w-full h-14 font-bold ${plan.highlight ? "gradient-primary" : "bg-white/5"}`} onClick={() => { setSelectedPlanKey(plan.key); setShowPaymentModal(true); }}>
                  {loadingPlan === plan.key ? <Loader2 className="w-5 h-5 animate-spin" /> : "Assinar Agora"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History */}
      {myRequests.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg">Últimos Pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myRequests.map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg text-sm">
                <div><span>{req.plan}</span><span className="ml-3 opacity-60">{new Date(req.created_at).toLocaleDateString()}</span></div>
                <Badge className={statusLabels[req.status]?.color || ""}>{statusLabels[req.status]?.label || req.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
