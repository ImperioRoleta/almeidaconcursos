import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, ChevronRight } from "lucide-react";

export default function LandingCTA() {
  return (
    <section className="container mx-auto px-4 py-16">
      <Card className="glass-card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <CardContent className="p-8 md:p-16 text-center relative z-10 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-gold flex items-center justify-center shadow-xl shadow-accent/20">
            <Award className="w-8 h-8 text-background" />
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Descubra seus pontos fracos <span className="text-accent">agora</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Faça o diagnóstico gratuito em 10 minutos e receba um plano de estudos personalizado pela IA.
          </p>
          <Link to="/cadastro">
            <Button size="lg" className="gradient-primary text-primary-foreground h-14 px-10 text-lg shadow-2xl shadow-primary/30">
              Fazer Diagnóstico Grátis <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
