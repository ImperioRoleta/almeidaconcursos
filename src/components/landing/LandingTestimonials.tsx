import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function LandingTestimonials() {
  const testimonials = [
    { name: "Carlos M.", role: "Aprovado 2025", text: "O diagnóstico inicial mostrou exatamente onde eu estava errando. O plano de estudos por IA mudou minha rotina." },
    { name: "Ana S.", role: "Estudante Premium", text: "Os simulados são idênticos à prova real. A revisão inteligente me fez parar de esquecer o que já tinha estudado." },
    { name: "Pedro L.", role: "Aprovado 2025", text: "O ranking me motivou a estudar mais. O feedback da IA depois de cada sessão fazia eu sentir que tinha um professor particular." },
  ];

  return (
    <section id="depoimentos" className="border-t border-border/50 bg-card/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-10 space-y-3">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            O que dizem nossos <span className="text-primary">alunos</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto stagger-children">
          {testimonials.map((t, i) => (
            <Card key={i} className="glass-card-hover">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-accent fill-accent" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
