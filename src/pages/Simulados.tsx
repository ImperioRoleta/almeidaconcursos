import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PremiumGate from "@/components/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Clock, Play, CheckCircle, XCircle } from "lucide-react";

export default function Simulados() {
  return (
    <PremiumGate feature="Simulados">
      <SimuladosContent />
    </PremiumGate>
  );
}

function SimuladosContent() {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<any[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("simulations").select("*, simulation_results(*)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setSimulations(data ?? []));
  }, [user]);

  const createSimulation = async () => {
    if (!user) return;
    // Fetch random questions
    const { data: qs } = await supabase.from("questions").select("*").limit(20);
    if (!qs || qs.length === 0) { toast.error("Nenhuma questão disponível"); return; }

    const { data: sim } = await supabase.from("simulations").insert({
      user_id: user.id,
      title: `Simulado ${new Date().toLocaleDateString("pt-BR")}`,
      total_questions: qs.length,
      time_limit_minutes: 60,
    }).select().single();

    if (!sim) return;
    setActiveSimulation(sim);
    setQuestions(qs);
    setTimeLeft(60 * 60);
    setAnswers({});
    setResult(null);

    // Load all options
    const ids = qs.map(q => q.id);
    const { data: opts } = await supabase.from("question_options").select("*").in("question_id", ids);
    const grouped: Record<string, any[]> = {};
    opts?.forEach(o => {
      if (!grouped[o.question_id]) grouped[o.question_id] = [];
      grouped[o.question_id].push(o);
    });
    setOptions(grouped);

    timerRef.current = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(timerRef.current); return 0; }
      return prev - 1;
    }), 1000);
  };

  const submitSimulation = async () => {
    if (!user || !activeSimulation) return;
    clearInterval(timerRef.current);

    let correct = 0;
    let wrong = 0;
    for (const q of questions) {
      const selectedId = answers[q.id];
      const opts = options[q.id] || [];
      const correctOpt = opts.find(o => o.is_correct);
      const isCorrect = selectedId === correctOpt?.id;
      if (isCorrect) correct++; else wrong++;

      if (selectedId) {
        await supabase.from("user_answers").insert({
          user_id: user.id,
          question_id: q.id,
          selected_option_id: selectedId,
          is_correct: isCorrect,
        });
      }
    }

    const score = Math.round((correct / questions.length) * 100);
    const elapsed = (activeSimulation.time_limit_minutes * 60) - timeLeft;

    await supabase.from("simulation_results").insert({
      simulation_id: activeSimulation.id,
      user_id: user.id,
      score,
      total_correct: correct,
      total_wrong: wrong,
      duration_seconds: elapsed,
    });

    await supabase.from("simulations").update({ status: "completed" }).eq("id", activeSimulation.id);

    setResult({ score, correct, wrong, elapsed });
    toast.success(`Simulado finalizado! ${score}% de acerto`);
  };

  useEffect(() => {
    if (timeLeft === 0 && activeSimulation && !result) submitSimulation();
  }, [timeLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (result) {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto text-center">
        <h1 className="font-heading text-2xl font-bold">Resultado do Simulado</h1>
        <Card className="glass-card">
          <CardContent className="p-8 space-y-4">
            <p className="text-5xl font-heading font-bold font-mono text-primary">{result.score}%</p>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {result.correct} acertos</span>
              <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> {result.wrong} erros</span>
            </div>
            <p className="text-muted-foreground text-sm">Tempo: {formatTime(result.elapsed)}</p>
          </CardContent>
        </Card>
        <Button onClick={() => { setActiveSimulation(null); setResult(null); }} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (activeSimulation) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div className="flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm py-2 z-10">
          <h1 className="font-heading text-xl font-bold">{activeSimulation.title}</h1>
          <div className="flex items-center gap-4">
            <span className="font-mono text-primary flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(timeLeft)}</span>
            <Button onClick={submitSimulation} className="gradient-primary text-primary-foreground" size="sm">Finalizar</Button>
          </div>
        </div>

        <div className="space-y-8">
          {questions.map((q, i) => (
            <Card key={q.id} className="glass-card">
              <CardContent className="p-6 space-y-4">
                <p className="font-medium"><span className="font-mono text-primary mr-2">{i + 1}.</span>{q.statement}</p>
                <div className="space-y-2">
                  {(options[q.id] || []).map(opt => (
                    <div key={opt.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                    >
                      <span className="font-mono text-sm text-primary mr-2">{opt.label})</span> {opt.text}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Simulados</h1>
          <p className="text-muted-foreground">Pratique com simulados completos</p>
        </div>
        <Button onClick={createSimulation} className="gradient-primary text-primary-foreground">
          <Play className="w-4 h-4 mr-2" /> Novo Simulado
        </Button>
      </div>

      <div className="space-y-3">
        {simulations.map(s => (
          <Card key={s.id} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <span className={`text-sm font-mono ${s.status === "completed" ? "text-green-400" : "text-gold"}`}>
                {s.status === "completed" ? `${s.simulation_results?.[0]?.score ?? 0}%` : "Em andamento"}
              </span>
            </CardContent>
          </Card>
        ))}
        {simulations.length === 0 && <p className="text-muted-foreground text-sm">Nenhum simulado realizado ainda.</p>}
      </div>
    </div>
  );
}
