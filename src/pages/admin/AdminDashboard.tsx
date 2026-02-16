import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, HelpCircle, FileText } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, subjects: 0, questions: 0, lessons: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [u, s, q, l] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
      ]);
      setStats({ users: u.count ?? 0, subjects: s.count ?? 0, questions: q.count ?? 0, lessons: l.count ?? 0 });
    };
    fetch();
  }, []);

  const cards = [
    { label: "Alunos", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Matérias", value: stats.subjects, icon: BookOpen, color: "text-gold" },
    { label: "Questões", value: stats.questions, icon: HelpCircle, color: "text-highlight" },
    { label: "Aulas", value: stats.lessons, icon: FileText, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold">Painel Administrativo</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-heading font-bold font-mono">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
