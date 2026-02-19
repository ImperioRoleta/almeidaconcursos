import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, ArrowRight, Star, Shield, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

type UpgradePromptProps = {
  variant?: "banner" | "compact" | "sidebar";
  context?: string;
};

export default function UpgradePrompt({ variant = "banner", context }: UpgradePromptProps) {
  const { isActive, loading } = useSubscription();
  const navigate = useNavigate();

  // Don't render anything while subscription is loading to prevent flash of free content
  if (loading) return null;
  if (isActive) return null;

  if (variant === "compact") {
    return (
      <div
        onClick={() => navigate("/assinatura")}
        className="relative overflow-hidden cursor-pointer group glass-card border-accent/20 hover:border-accent/40 transition-all"
      >
        <div className="premium-shimmer absolute inset-0 pointer-events-none" />
        <CardContent className="p-3 flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shrink-0 shadow-md shadow-accent/20">
            <Crown className="w-4 h-4 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-heading font-semibold text-accent truncate">
              {context || "Desbloqueie tudo"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Questões ilimitadas, IA e simulados
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </CardContent>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        onClick={() => navigate("/assinatura")}
        className="mx-3 mb-3 relative overflow-hidden cursor-pointer rounded-xl border border-accent/20 bg-accent/5 hover:border-accent/30 transition-all group"
      >
        <div className="premium-shimmer absolute inset-0 pointer-events-none rounded-xl" />
        <div className="p-3 relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <span className="text-xs font-heading font-bold text-accent">Premium</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Acesse aulas, simulados, IA e muito mais
          </p>
          <div className="flex items-center gap-1 text-[10px] text-accent font-semibold group-hover:gap-2 transition-all">
            Ver planos <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    );
  }

  // Default banner
  return (
    <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-r from-accent/5 via-card to-primary/5">
      <div className="premium-shimmer absolute inset-0 pointer-events-none" />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shadow-lg shadow-accent/20 animate-float">
              <Crown className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                Desbloqueie o Premium
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                  <Star className="w-2.5 h-2.5" /> POPULAR
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {context || "Questões ilimitadas, simulados, IA e plano de estudos personalizado"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/assinatura")}
            size="sm"
            className="gradient-gold text-accent-foreground font-semibold shadow-lg shadow-accent/20 hover:shadow-accent/30 gap-1.5"
          >
            <Zap className="w-4 h-4" /> Assinar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
