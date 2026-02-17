import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, ArrowRight, Flame, TicketPercent } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  billing_period: string;
  badge_text: string | null;
  is_active: boolean;
  is_blocked: boolean;
  is_featured: boolean;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  valid_until: string | null;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (diff <= 0) return null;

  const units = [
    { value: days, label: "d" },
    { value: hours, label: "h" },
    { value: minutes, label: "m" },
    { value: seconds, label: "s" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {units.map((u, i) => (
        <div key={i} className="flex items-center">
          <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 min-w-[44px] text-center">
            <span className="font-mono font-bold text-lg leading-none">{String(u.value).padStart(2, "0")}</span>
            <span className="text-[9px] text-muted-foreground uppercase block mt-0.5">{u.label}</span>
          </div>
          {i < units.length - 1 && <span className="text-muted-foreground font-bold mx-0.5">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function LandingPromotions() {
  const [promoPlans, setPromoPlans] = useState<Plan[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const plansRes = await supabase.from("plans").select("*").eq("is_active", true).eq("is_blocked", false).not("original_price", "is", null).order("order_index");

      const plans = (plansRes.data ?? []) as Plan[];
      setPromoPlans(plans.filter(p => p.original_price && p.original_price > p.price));

      // Coupons are no longer publicly readable for security.
      setActiveCoupons([]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || (promoPlans.length === 0 && activeCoupons.length === 0)) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-10 space-y-3">
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 mb-2 animate-pulse">
          <Flame className="w-3 h-3 mr-1" /> Promoções Ativas
        </Badge>
        <h2 className="font-heading text-3xl md:text-4xl font-bold">
          Ofertas <span className="text-destructive">imperdíveis</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Aproveite nossos descontos por tempo limitado e comece a estudar com tudo!
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Promo plans */}
        {promoPlans.map(plan => {
          const discount = plan.original_price
            ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
            : 0;
          return (
            <Card key={plan.id} className="relative overflow-hidden border-destructive/20 bg-gradient-to-r from-destructive/5 via-transparent to-accent/5">
              <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground px-4 py-1.5 text-sm font-bold rounded-bl-xl">
                -{discount}% OFF
              </div>
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Zap className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-heading font-extrabold text-destructive">
                        R$ {plan.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-muted-foreground line-through text-sm">
                        R$ {plan.original_price!.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /{plan.billing_period === "monthly" ? "mês" : plan.billing_period === "annual" ? "ano" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Economize R$ {(plan.original_price! - plan.price).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
                <Link to="/cadastro">
                  <Button size="lg" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 shadow-lg shadow-destructive/20">
                    Aproveitar Oferta <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}

        {/* Active coupons */}
        {activeCoupons.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <TicketPercent className="w-5 h-5 text-accent" /> Cupons de Desconto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCoupons.map(coupon => (
                <Card key={coupon.id} className="glass-card border-accent/20 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <TicketPercent className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <code className="font-mono font-bold text-lg">{coupon.code}</code>
                          <p className="text-xs text-muted-foreground">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% de desconto`
                              : `R$ ${coupon.discount_value.toFixed(2)} de desconto`}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                        Ativo
                      </Badge>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
                    )}
                    {coupon.valid_until && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Expira em:</span>
                        <CountdownTimer targetDate={new Date(coupon.valid_until)} />
                      </div>
                    )}
                    {coupon.max_uses && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {coupon.max_uses - coupon.current_uses} uso(s) restante(s)
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
