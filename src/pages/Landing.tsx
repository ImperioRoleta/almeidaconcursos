import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, BookOpen, Brain, Target, Award, ChevronRight } from "lucide-react";

export default function Landing() {
  const features = [
    { icon: BookOpen, title: "Aulas Completas", desc: "Conteúdo estruturado por matéria do edital SD PMBA" },
    { icon: Brain, title: "IA Educacional", desc: "Assistente inteligente para explicar e resolver questões" },
    { icon: Target, title: "Banco de Questões", desc: "Questões com correção automática e explicação detalhada" },
    { icon: Award, title: "Sistema de Níveis", desc: "Evolua de Recruta a Oficial de Mérito com base no desempenho" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Elite PMBA</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="gradient-primary text-primary-foreground">Começar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50 text-sm text-muted-foreground">
          <Award className="w-4 h-4 text-gold" />
          Preparação de Alto Nível
        </div>
        <h1 className="font-heading text-4xl md:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
          Treine como um{" "}
          <span className="text-primary">futuro policial</span>{" "}
          <span className="text-gold">militar</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Plataforma educacional profissional para o concurso Soldado PMBA. Aulas, questões, simulados e IA personalizada.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/cadastro">
            <Button size="lg" className="gradient-primary text-primary-foreground gap-2">
              Começar Agora <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-6 space-y-4 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Elite PMBA — Preparação de Alto Nível. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
