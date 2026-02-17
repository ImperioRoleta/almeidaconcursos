import { Crosshair, Brain, Target, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingMethod() {
  const steps = [
    {
      step: "01",
      icon: Crosshair,
      title: "Diagnóstico Inteligente",
      desc: "No primeiro acesso, um mini simulado identifica seus pontos fortes e fracos. A plataforma entende você.",
    },
    {
      step: "02",
      icon: Brain,
      title: "Plano Personalizado por IA",
      desc: "A IA monta seu cronograma: Aula → Questões → Revisão → Simulado. Adaptado às suas horas disponíveis.",
    },
    {
      step: "03",
      icon: Target,
      title: "Estudo Guiado",
      desc: "Siga a trilha obrigatória. A plataforma te diz exatamente o que estudar, quando e por quanto tempo.",
    },
    {
      step: "04",
      icon: BarChart3,
      title: "Evolução Visível",
      desc: "Dashboard personalizado com previsão de evolução, feedback da IA e ranking para manter a motivação.",
    },
  ];

  return (
    <section id="metodo" className="container mx-auto px-4 py-20">
      <div className="text-center mb-14 space-y-3">
        <p className="text-primary text-sm font-semibold uppercase tracking-widest">Como funciona</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold">
          Do diagnóstico à <span className="text-primary">aprovação</span> em 4 passos
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Nada de estudar no escuro. Nosso método guia você do zero ao aprovado com inteligência artificial.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {steps.map((s, i) => (
          <Card key={i} className="glass-card-hover group relative overflow-hidden">
            <div className="absolute top-4 right-4 text-5xl font-heading font-extrabold text-primary/5 group-hover:text-primary/10 transition-colors">
              {s.step}
            </div>
            <CardContent className="p-6 space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
