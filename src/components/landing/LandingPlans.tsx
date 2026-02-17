import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, CheckCircle } from "lucide-react";

export default function LandingPlans() {
  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "para sempre",
      highlight: false,
      badge: "",
      features: [
        "Diagnóstico inicial completo",
        "Acesso a aulas básicas",
        "50 questões por mês",
        "1 simulado por mês",
        "Ranking público",
      ],
      cta: "Começar Grátis",
    },
    {
      name: "Premium Mensal",
      price: "R$ 39,90",
      period: "/mês",
      highlight: true,
      badge: "Mais Popular",
      features: [
        "Todas as aulas do edital",
        "Questões ilimitadas",
        "Simulados ilimitados",
        "IA Tutora completa",
        "Plano de estudos IA personalizado",
        "Revisão inteligente (spaced repetition)",
        "Feedback pós-estudo com IA",
        "Suporte prioritário",
      ],
      cta: "Assinar Premium",
    },
    {
      name: "Premium Anual",
      price: "R$ 29,90",
      period: "/mês",
      highlight: false,
      badge: "Economia de 25%",
      features: [
        "Tudo do Premium Mensal",
        "Desconto de 25%",
        "Cobrado R$ 358,80/ano",
        "Acesso antecipado a novidades",
        "Certificado de conclusão",
        "Grupo exclusivo",
      ],
      cta: "Assinar Anual",
    },
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
        {plans.map((plan, i) => (
          <Card key={i} className={`relative overflow-hidden transition-all duration-300 ${plan.highlight ? "border-primary/50 bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]" : "glass-card hover:border-border/80"}`}>
            {plan.badge && (
              <div className="absolute top-4 right-4">
                <Badge className={plan.highlight ? "gradient-primary text-primary-foreground border-0" : "bg-accent/10 text-accent border-accent/20"}>
                  {plan.badge}
                </Badge>
              </div>
            )}
            <CardContent className="p-6 pt-8 space-y-6">
              <div>
                <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading font-extrabold text-4xl">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cadastro" className="block">
                <Button className={`w-full h-12 font-semibold ${plan.highlight ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20" : ""}`} variant={plan.highlight ? "default" : "outline"}>
                  {plan.cta}
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
