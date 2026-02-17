import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, CheckCircle, Clock, Star, Crosshair } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-56 h-56 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-24 md:py-32 text-center space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary font-medium animate-fade-in">
          <Crosshair className="w-4 h-4" />
          Método Estratégico + IA Especializada
        </div>

        <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold max-w-4xl mx-auto leading-[1.1] animate-fade-in">
          Treine para{" "}
          <span className="bg-gradient-to-r from-primary to-[hsl(210,80%,55%)] bg-clip-text text-transparent">SD PMBA</span>{" "}
          com método{" "}
          <span className="bg-gradient-to-r from-accent to-[hsl(43,90%,65%)] bg-clip-text text-transparent">estratégico</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in">
          A IA analisa seus pontos fracos no primeiro acesso, monta seu plano personalizado e guia cada passo até a aprovação. Estude com inteligência, não com esforço cego.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in">
          <Link to="/cadastro">
            <Button size="lg" className="gradient-primary text-primary-foreground gap-2 h-14 px-8 text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-shadow">
              Fazer Diagnóstico Grátis <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <a href="#metodo">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
              Como Funciona
            </Button>
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground animate-fade-in">
          {[
            { icon: Users, text: "500+ alunos ativos" },
            { icon: CheckCircle, text: "Sem cartão de crédito" },
            { icon: Clock, text: "Diagnóstico em 10 min" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-primary" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
