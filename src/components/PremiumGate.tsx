import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PremiumGateProps = {
  children: React.ReactNode;
  feature?: string;
  /** If true, shows inline lock badge instead of full-page block */
  inline?: boolean;
  /** Show usage limit info e.g. "3/10 questões hoje" */
  usageLabel?: string;
};

const PREMIUM_FEATURES = [
  "Plano de Estudos com IA",
  "IA Assistente ilimitada",
  "Simulados completos",
  "Aulas premium",
  "Questões ilimitadas",
  "Ranking completo",
  "Redações ilimitadas",
  "Revisões completas",
];

export default function PremiumGate({ children, feature, inline = false, usageLabel }: PremiumGateProps) {
  const { isActive, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isActive) return <>{children}</>;

  if (inline) {
    return (
      <div
        className="relative cursor-pointer group"
        onClick={() => navigate("/assinatura")}
      >
        <div className="opacity-40 pointer-events-none blur-[2px]">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-accent/90 text-accent-foreground text-sm font-semibold shadow-lg group-hover:scale-105 transition-transform">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Premium
            </div>
            {usageLabel && (
              <span className="text-[10px] font-normal opacity-80">{usageLabel}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Card className="glass-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10" />
        <CardContent className="p-8 md:p-12 text-center relative z-10 space-y-6">
          <div className="w-20 h-20 rounded-3xl gradient-gold mx-auto flex items-center justify-center shadow-2xl shadow-accent/30">
            <Crown className="w-10 h-10 text-accent-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold">
              {feature ? `${feature} é Premium` : "Conteúdo Premium"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Faça upgrade para desbloquear todos os recursos avançados da plataforma e acelerar sua preparação.
            </p>
            {usageLabel && (
              <p className="text-sm font-medium text-accent">{usageLabel}</p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {PREMIUM_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate("/assinatura")}
            size="lg"
            className="gradient-gold text-accent-foreground h-14 px-10 text-lg font-semibold shadow-xl shadow-accent/30 hover:shadow-accent/40 transition-shadow"
          >
            <Sparkles className="w-5 h-5 mr-2" /> Ver Planos Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
