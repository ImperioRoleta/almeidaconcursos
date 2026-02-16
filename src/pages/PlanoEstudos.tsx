import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PremiumGate from "@/components/PremiumGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, Sparkles, Loader2, CheckCircle2, Circle, Clock,
  Target, Trophy, Flame, ChevronRight, Plus, Trash2, RotateCcw,
  BookOpen, Brain, Zap
} from "lucide-react";

type DayTask = {
  id: string;
  title: string;
  subject: string;
  type: "lesson" | "questions" | "review" | "simulation";
  duration_min: number;
  done: boolean;
};

type PlanDay = {
  day: number;
  label: string;
  focus: string;
  tasks: DayTask[];
};

type StudyPlan = {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  current_day: number;
  plan_data: PlanDay[];
  status: string;
  created_at: string;
};

export default function PlanoEstudos() {
  return (
    <PremiumGate feature="Plano de Estudos">
      <PlanoEstudosContent />
    </PremiumGate>
  );
}

function PlanoEstudosContent() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const parsed = (data ?? []).map((p: any) => ({
      ...p,
      plan_data: typeof p.plan_data === "string" ? JSON.parse(p.plan_data) : p.plan_data,
    })) as StudyPlan[];

    setPlans(parsed);
    const active = parsed.find(p => p.status === "active");
    if (active) {
      setActivePlan(active);
      setSelectedDay(Math.min(active.current_day - 1, (active.plan_data?.length ?? 1) - 1));
    }
    setLoading(false);
  };

  const generatePlan = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      // Fetch user stats for personalization
      const [answersRes, sessionsRes, subjectsRes] = await Promise.all([
        supabase.from("user_answers").select("is_correct, question_id").eq("user_id", user.id),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", user.id),
        supabase.from("subjects").select("id, name").order("order_index"),
      ]);

      const answers = answersRes.data ?? [];
      const sessions = sessionsRes.data ?? [];
      const subjects = subjectsRes.data ?? [];
      const totalHours = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 3600;
      const accuracy = answers.length > 0 ? Math.round((answers.filter(a => a.is_correct).length / answers.length) * 100) : 0;

      const subjectNames = subjects.map(s => s.name).join(", ");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Você é um especialista em planejamento de estudos para concursos militares. Crie um plano de estudos PERSONALIZADO de 30 dias para o concurso SD PMBA.

DADOS DO ALUNO:
- Horas estudadas: ${totalHours.toFixed(1)}h
- Taxa de acerto: ${accuracy}%
- Matérias disponíveis: ${subjectNames}

INSTRUÇÕES RIGOROSAS - Retorne APENAS um JSON válido sem nenhum texto antes ou depois, no formato:
{
  "title": "Plano Personalizado 30 Dias - SD PMBA",
  "description": "Descrição curta do plano",
  "days": [
    {
      "day": 1,
      "label": "Dia 1 - Segunda",
      "focus": "Matéria principal do dia",
      "tasks": [
        {"id": "d1t1", "title": "Estudar artigos 1-10 da CF", "subject": "Direito Constitucional", "type": "lesson", "duration_min": 45, "done": false},
        {"id": "d1t2", "title": "Resolver 20 questões sobre direitos fundamentais", "subject": "Direito Constitucional", "type": "questions", "duration_min": 30, "done": false},
        {"id": "d1t3", "title": "Revisar anotações do dia", "subject": "Direito Constitucional", "type": "review", "duration_min": 15, "done": false}
      ]
    }
  ]
}

Gere EXATAMENTE 30 dias. Cada dia deve ter 3-5 tarefas variadas. Alterne matérias estrategicamente. Inclua dias de revisão (a cada 7 dias). O tipo pode ser: lesson, questions, review, simulation. Distribua as matérias uniformemente.`
          }],
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro ao gerar plano");

      // Read the full streamed response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch {}
        }
      }

      // Parse JSON from response
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou JSON válido");

      const planJson = JSON.parse(jsonMatch[0]);
      const planDays: PlanDay[] = (planJson.days || []).map((d: any) => ({
        day: d.day,
        label: d.label,
        focus: d.focus,
        tasks: (d.tasks || []).map((t: any) => ({ ...t, done: false })),
      }));

      const { data: inserted, error } = await supabase.from("study_plans").insert({
        user_id: user.id,
        title: planJson.title || "Plano de Estudos 30 Dias",
        description: planJson.description || null,
        total_days: planDays.length,
        current_day: 1,
        plan_data: planDays as any,
        status: "active",
      }).select().single();

      if (error) throw error;

      toast.success("Plano de estudos gerado com sucesso!");
      await fetchPlans();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar plano");
    }
    setGenerating(false);
  };

  const toggleTask = async (dayIndex: number, taskId: string) => {
    if (!activePlan) return;
    const updated = { ...activePlan };
    const day = updated.plan_data[dayIndex];
    const task = day.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.done = !task.done;

    // Auto advance current_day
    const allDone = day.tasks.every(t => t.done);
    if (allDone && dayIndex + 1 === updated.current_day && updated.current_day < updated.total_days) {
      updated.current_day = updated.current_day + 1;
    }

    await supabase.from("study_plans").update({
      plan_data: updated.plan_data as any,
      current_day: updated.current_day,
    }).eq("id", updated.id);

    setActivePlan({ ...updated });
  };

  const deletePlan = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    toast.success("Plano removido");
    setActivePlan(null);
    fetchPlans();
  };

  // Stats
  const completedTasks = activePlan?.plan_data.flatMap(d => d.tasks).filter(t => t.done).length ?? 0;
  const totalTasks = activePlan?.plan_data.flatMap(d => d.tasks).length ?? 1;
  const progressPct = Math.round((completedTasks / totalTasks) * 100);
  const currentDayData = activePlan?.plan_data[selectedDay];

  const typeIcon: Record<string, any> = {
    lesson: BookOpen,
    questions: Target,
    review: Brain,
    simulation: Zap,
  };
  const typeLabel: Record<string, string> = {
    lesson: "Aula",
    questions: "Questões",
    review: "Revisão",
    simulation: "Simulado",
  };
  const typeColor: Record<string, string> = {
    lesson: "text-primary",
    questions: "text-gold",
    review: "text-highlight",
    simulation: "text-green-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No active plan — show creation screen
  if (!activePlan) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
            <CalendarDays className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Plano de Estudos</h1>
            <p className="text-muted-foreground text-sm">Seu plano personalizado com IA, adaptado ao seu nível</p>
          </div>
        </div>

        {/* Hero card */}
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/10" />
          <CardContent className="p-8 md:p-12 text-center relative z-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl gradient-primary mx-auto flex items-center justify-center shadow-2xl shadow-primary/30">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-bold">Crie seu Plano Inteligente</h2>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                A IA analisa seu desempenho, matérias do edital e tempo disponível para criar um plano de 30 dias 100% personalizado para você.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {[
                { icon: Target, text: "Baseado no seu desempenho" },
                { icon: CalendarDays, text: "30 dias estruturados" },
                { icon: Brain, text: "Revisões espaçadas" },
                { icon: Flame, text: "Progressão inteligente" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <f.icon className="w-4 h-4 text-primary" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            <Button onClick={generatePlan} disabled={generating} size="lg"
              className="gradient-primary text-primary-foreground h-14 px-10 text-lg font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-shadow">
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando seu plano personalizado...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Gerar Meu Plano com IA</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active plan view
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/20">
            <CalendarDays className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold">{activePlan.title}</h1>
            <p className="text-muted-foreground text-sm">{activePlan.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { deletePlan(activePlan.id); }}
            className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-1" /> Excluir
          </Button>
          <Button variant="outline" size="sm" onClick={generatePlan} disabled={generating}>
            <RotateCcw className="w-4 h-4 mr-1" /> Novo Plano
          </Button>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Progresso", value: `${progressPct}%`, icon: Trophy, color: "text-gold" },
          { label: "Dia Atual", value: `${activePlan.current_day}/${activePlan.total_days}`, icon: CalendarDays, color: "text-primary" },
          { label: "Tarefas Feitas", value: `${completedTasks}/${totalTasks}`, icon: CheckCircle2, color: "text-green-400" },
          { label: "Tempo Estimado", value: `${currentDayData ? currentDayData.tasks.reduce((s, t) => s + t.duration_min, 0) : 0}min`, icon: Clock, color: "text-highlight" },
        ].map((c, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-heading font-bold font-mono">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Progress value={progressPct} className="h-2" />

      {/* Day selector + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Day timeline */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">Calendário</CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto space-y-1">
            {activePlan.plan_data.map((d, i) => {
              const dayDone = d.tasks.every(t => t.done);
              const dayPartial = d.tasks.some(t => t.done);
              const isSelected = selectedDay === i;
              const isCurrent = i === activePlan.current_day - 1;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all
                    ${isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}
                    ${isCurrent && !isSelected ? "border border-gold/20" : ""}
                  `}
                >
                  {dayDone ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : dayPartial ? (
                    <div className="w-4 h-4 rounded-full border-2 border-gold shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      Dia {d.day}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{d.focus}</p>
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gold/40 text-gold shrink-0">
                      HOJE
                    </Badge>
                  )}
                  <ChevronRight className={`w-3 h-3 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Tasks for selected day */}
        <div className="space-y-4">
          {currentDayData && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold">{currentDayData.label}</h2>
                  <p className="text-sm text-muted-foreground">Foco: {currentDayData.focus}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentDayData.tasks.filter(t => t.done).length}/{currentDayData.tasks.length} tarefas
                </Badge>
              </div>

              <div className="space-y-3">
                {currentDayData.tasks.map((task) => {
                  const Icon = typeIcon[task.type] || BookOpen;
                  return (
                    <Card
                      key={task.id}
                      className={`glass-card cursor-pointer transition-all hover:border-primary/20 ${task.done ? "opacity-60" : ""}`}
                      onClick={() => toggleTask(selectedDay, task.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task.done ? "bg-green-500/10" : "bg-primary/10"}`}>
                          {task.done ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <Icon className={`w-5 h-5 ${typeColor[task.type] || "text-primary"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{task.subject}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {typeLabel[task.type] || task.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {task.duration_min}min
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
