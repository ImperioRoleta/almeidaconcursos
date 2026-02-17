import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, CheckCircle } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  billing_period: string;
  features: string[];
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_blocked: boolean;
  order_index: number;
  badge_text: string | null;
  color: string | null;
}

const periodLabels: Record<string, string> = {
  free: "para sempre",
  monthly: "/mês",
  annual: "/mês",
  one_time: " único",
};

export default function LandingPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .eq("is_blocked", false)
      .order("order_index")
      .then(({ data }) => {
        setPlans((data ?? []) as Plan[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="planos" className="container mx-auto px-4 py-20">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section id="planos" className="container mx-auto px-4 py-20">
      <div className="text-center mb-12 space-y-3">
        <Badge className="bg-accent/10 text-accent border-accent/20 mb-2">
          <Crown className="w-3 h-3 mr-1" /> Planos
        </Badge>
        <h2 className="font-heading text-3xl md:text-4xl font-bold">
          Escolha o plano <span className="text-accent">ideal</span> para você
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Comece grátis com diagnóstico completo. Faça upgrade quando quiser.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "max-w-md mx-auto"} gap-6 max-w-5xl mx-auto stagger-children`}>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden transition-all duration-300 ${
              plan.is_featured
                ? "border-primary/50 bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]"
                : "glass-card hover:border-border/80"
            }`}
          >
            {plan.image_url && (
              <div className="h-36 overflow-hidden">
                <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover" />
              </div>
            )}
            {plan.badge_text && (
              <div className="absolute top-4 right-4">
                <Badge
                  className={
                    plan.is_featured
                      ? "gradient-primary text-primary-foreground border-0"
                      : "bg-accent/10 text-accent border-accent/20"
                  }
                >
                  {plan.badge_text}
                </Badge>
              </div>
            )}
            <CardContent className="p-6 pt-8 space-y-6">
              <div>
                <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                )}
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-heading font-extrabold text-4xl">
                    R$ {plan.price.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {periodLabels[plan.billing_period] || ""}
                  </span>
                </div>
                {plan.original_price && plan.original_price > plan.price && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground line-through">
                      R$ {plan.original_price.toFixed(2).replace(".", ",")}
                    </span>
                    <Badge className="bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] text-xs">
                      -{Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)}% OFF
                    </Badge>
                  </div>
                )}
              </div>
              <ul className="space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle
                      className={`w-4 h-4 shrink-0 ${
                        plan.is_featured ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cadastro" className="block">
                <Button
                  className={`w-full h-12 font-semibold ${
                    plan.is_featured
                      ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : ""
                  }`}
                  variant={plan.is_featured ? "default" : "outline"}
                >
                  {plan.billing_period === "free" ? "Começar Grátis" : "Assinar Agora"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        💳 Pagamento seguro via Mercado Pago • Cancele quando quiser
      </p>
    </section>
  );
}
