import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, BookOpen, Brain, Target, Award, ChevronRight, Trophy, Zap, Users, Star, CheckCircle, Clock, BarChart3, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const features = [
    { icon: BookOpen, title: "Aulas Estruturadas", desc: "Conteúdo completo e organizado por matéria do edital SD PMBA, com formatação rica." },
    { icon: Brain, title: "IA Personalizada", desc: "Assistente inteligente que explica, resolve e adapta o ensino ao seu nível." },
    { icon: Target, title: "Banco de Questões", desc: "Milhares de questões com correção automática, explicação detalhada e estatísticas." },
    { icon: CalendarDays, title: "Plano de Estudos IA", desc: "Plano de 30 dias gerado por IA, baseado no seu desempenho e pontos fracos." },
    { icon: Trophy, title: "Ranking & Gamificação", desc: "Compita com outros alunos, suba de patente e mantenha sua sequência de dias." },
    { icon: Zap, title: "Simulados Cronometrados", desc: "Simulados completos que reproduzem a experiência real da prova." },
  ];

  const stats = [
    { value: "10k+", label: "Questões", icon: BarChart3 },
    { value: "30", label: "Dias de Plano", icon: CalendarDays },
    { value: "98%", label: "Aprovação", icon: Award },
    { value: "24/7", label: "IA Disponível", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Elite PMBA</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-56 h-56 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-24 md:py-32 text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary font-medium animate-fade-in">
            <Star className="w-4 h-4" />
            Plataforma #1 para SD PMBA
          </div>

          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold max-w-4xl mx-auto leading-[1.1] animate-fade-in">
            Sua aprovação no{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(210,80%,55%)] bg-clip-text text-transparent">concurso militar</span>{" "}
            começa{" "}
            <span className="bg-gradient-to-r from-accent to-[hsl(43,90%,65%)] bg-clip-text text-transparent">aqui</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in">
            Estude com inteligência artificial, acompanhe seu progresso em tempo real e conquiste sua vaga na Polícia Militar da Bahia.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in">
            <Link to="/cadastro">
              <Button size="lg" className="gradient-primary text-primary-foreground gap-2 h-14 px-8 text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-shadow">
                Começar Agora — É Grátis <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Já tenho conta
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground animate-fade-in">
            {[
              { icon: Users, text: "500+ alunos ativos" },
              { icon: CheckCircle, text: "Sem cartão de crédito" },
              { icon: Clock, text: "Acesso imediato" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center space-y-1">
                <s.icon className="w-5 h-5 mx-auto text-primary mb-2" />
                <p className="font-heading text-3xl font-bold font-mono bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Tudo que você precisa para <span className="text-primary">passar</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Uma plataforma completa que combina tecnologia, pedagogia e gamificação para maximizar sua preparação.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {features.map((f, i) => (
            <Card key={i} className="glass-card-hover group">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <CardContent className="p-8 md:p-16 text-center relative z-10 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-gold flex items-center justify-center shadow-xl shadow-accent/20">
              <Award className="w-8 h-8 text-background" />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Comece sua jornada <span className="text-accent">hoje</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Milhares de alunos já estão se preparando com a Elite PMBA. Não fique para trás.
            </p>
            <Link to="/cadastro">
              <Button size="lg" className="gradient-primary text-primary-foreground h-14 px-10 text-lg shadow-2xl shadow-primary/30">
                Criar Conta Grátis <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Elite PMBA — Preparação de Alto Nível para Soldado PM Bahia.
        </div>
      </footer>
    </div>
  );
}
