import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Questoes() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0 });

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  const startPractice = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    let query = supabase.from("questions").select("*").eq("subject_id", subjectId);
    if (!isActive) query = query.eq("is_premium", false);
    const { data } = await query.limit(20);
    setQuestions(data ?? []);
    setCurrentIdx(0);
    setStats({ total: 0, correct: 0 });
    if (data && data.length > 0) loadOptions(data[0].id);
  };

  const loadOptions = async (questionId: string) => {
    const { data } = await supabase.from("question_options").select("*").eq("question_id", questionId);
    setOptions(data ?? []);
    setSelected(null);
    setAnswered(false);
  };

  const handleAnswer = async (optionId: string) => {
    if (answered || !user) return;
    setSelected(optionId);
    setAnswered(true);
    const opt = options.find(o => o.id === optionId);
    const isCorrect = opt?.is_correct ?? false;

    await supabase.from("user_answers").insert({
      user_id: user.id,
      question_id: questions[currentIdx].id,
      selected_option_id: optionId,
      is_correct: isCorrect,
    });

    setStats(prev => ({ total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) }));
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      loadOptions(questions[next].id);
    } else {
      toast.success(`Prática finalizada! ${stats.correct}/${stats.total} acertos`);
      setSelectedSubject(null);
    }
  };

  if (!selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-heading text-2xl font-bold">Questões</h1>
        <p className="text-muted-foreground">Escolha uma matéria para praticar</p>
        {!isActive && (
          <Card className="glass-card border-accent/20 cursor-pointer hover:border-accent/40 transition-colors" onClick={() => navigate("/assinatura")}>
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="text-accent font-semibold">Premium:</span> Desbloqueie todas as questões, incluindo as exclusivas do plano premium.
              </p>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <Card key={s.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => startPractice(s.id)}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <p className="font-heading font-semibold">{s.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelectedSubject(null)}>← Voltar</Button>
        <p className="text-muted-foreground">Nenhuma questão disponível para esta matéria.</p>
      </div>
    );
  }

  const q = questions[currentIdx];
  const correctOpt = options.find(o => o.is_correct);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setSelectedSubject(null)}>← Voltar</Button>
        <span className="text-sm text-muted-foreground font-mono">{currentIdx + 1}/{questions.length} • {stats.correct}/{stats.total} acertos</span>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <p className="font-medium text-lg">{q.statement}</p>

          <div className="space-y-3">
            {options.map(opt => {
              let classes = "glass-card p-4 cursor-pointer transition-colors";
              if (answered) {
                if (opt.is_correct) classes += " border-green-500/50 bg-green-500/10";
                else if (opt.id === selected && !opt.is_correct) classes += " border-red-500/50 bg-red-500/10";
              } else {
                classes += " hover:border-primary/30";
              }
              return (
                <div key={opt.id} className={classes} onClick={() => handleAnswer(opt.id)}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary">{opt.label})</span>
                    <span>{opt.text}</span>
                    {answered && opt.is_correct && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
                    {answered && opt.id === selected && !opt.is_correct && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                  </div>
                </div>
              );
            })}
          </div>

          {answered && q.explanation && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Explicação:</p>
              <p className="text-sm text-muted-foreground">{q.explanation}</p>
            </div>
          )}

          {answered && (
            <Button onClick={nextQuestion} className="gradient-primary text-primary-foreground">
              {currentIdx + 1 < questions.length ? "Próxima Questão" : "Finalizar"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
