import { BookOpen, Brain, Target, CalendarDays, Trophy, Zap, BarChart3, Award, Clock, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingFeatures() {
  const features = [
    { icon: BookOpen, title: "Aulas Estruturadas", desc: "Conteúdo completo e organizado por matéria do edital SD PMBA." },
    { icon: Brain, title: "IA Tutora Personalizada", desc: "Explica erros, sugere próximo passo e gera questões sob medida." },
    { icon: Target, title: "Banco de Questões", desc: "Milhares de questões com correção automática e explicação detalhada." },
    { icon: CalendarDays, title: "Plano de Estudos IA", desc: "Cronograma de 30 dias gerado por IA, baseado no seu diagnóstico." },
    { icon: Trophy, title: "Ranking & Patentes", desc: "Compita com outros alunos, suba de patente e conquiste badges." },
    { icon: Zap, title: "Simulados Cronometrados", desc: "Reproduzem a experiência real da prova com feedback inteligente." },
  ];

  const stats = [
    { value: "10k+", label: "Questões", icon: BarChart3 },
    { value: "30", label: "Dias de Plano", icon: CalendarDays },
    { value: "98%", label: "Aprovação", icon: Award },
    { value: "24/7", label: "IA Disponível", icon: Brain },
  ];

  return (
    <>
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

      {/* Features grid */}
      <section id="recursos" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Tudo que você precisa para <span className="text-primary">passar</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tecnologia, pedagogia e gamificação em uma plataforma que te guia até a aprovação.
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

      {/* Achievements preview */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-10 space-y-3">
            <h2 className="font-heading text-3xl md:text-4xl font-bold flex items-center justify-center gap-3">
              <Flame className="w-8 h-8 text-[hsl(25,95%,53%)]" />
              Sistema de Conquistas
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Desbloqueie badges e acumule XP conforme evolui nos estudos.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto stagger-children">
            {[
              { icon: Target, name: "Centurião", desc: "100 questões", color: "gradient-primary" },
              { icon: Clock, name: "Maratonista", desc: "10h de estudo", color: "gradient-gold" },
              { icon: Flame, name: "Semana Perfeita", desc: "7 dias seguidos", color: "gradient-success" },
              { icon: Award, name: "Excelência", desc: "90% de acerto", color: "gradient-gold" },
            ].map((b, i) => (
              <div key={i} className="glass-card p-4 text-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl ${b.color} mx-auto flex items-center justify-center shadow-lg`}>
                  <b.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h4 className="font-heading font-semibold text-sm">{b.name}</h4>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
