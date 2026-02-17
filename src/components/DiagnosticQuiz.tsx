import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crosshair, ChevronRight, CheckCircle, XCircle, Brain, Target, BookOpen, Loader2 } from "lucide-react";

type DiagnosticQuestion = {
  id: string;
  statement: string;
  subject_id: string;
  subject_name: string;
  options: { id: string; label: string; text: string; is_correct: boolean }[];
};

type SubjectScore = { name: string; correct: number; total: number; percentage: number };

export default function DiagnosticQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"intro" | "quiz" | "analyzing" | "results">("intro");
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string; isCorrect: boolean; subjectId: string; subjectName: string }[]>([]);
  const [results, setResults] = useState<{ score: number; subjectScores: SubjectScore[]; weakSubjects: string[]; strongSubjects: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    // Get all subjects
    const { data: subjects } = await supabase.from("subjects").select("id, name").order("order_index");
    if (!subjects || subjects.length === 0) {
      toast.error("Nenhuma matéria encontrada. Contate o administrador.");
      setLoading(false);
      return;
    }

    // Get 2-3 questions per subject for a quick diagnostic
    const allQuestions: DiagnosticQuestion[] = [];
    for (const subject of subjects) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, statement, subject_id")
        .eq("subject_id", subject.id)
        .eq("is_premium", false)
        .limit(3);
      
      if (qs && qs.length > 0) {
        for (const q of qs) {
          const { data: opts } = await supabase
            .from("question_options")
            .select("id, label, text, is_correct")
            .eq("question_id", q.id);
          
          if (opts && opts.length > 0) {
            allQuestions.push({
              ...q,
              subject_name: subject.name,
              options: opts,
            });
          }
        }
      }
    }

    // Shuffle and limit to ~15 questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15);
    setQuestions(shuffled);
    setLoading(false);
  };

  const handleAnswer = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
    const question = questions[currentIdx];
    const isCorrect = question.options.find(o => o.id === optionId)?.is_correct ?? false;
    setShowFeedback(true);

    setAnswers(prev => [...prev, {
      questionId: question.id,
      optionId,
      isCorrect,
      subjectId: question.subject_id,
      subjectName: question.subject_name,
    }]);
  };

  const nextQuestion = async () => {
    setSelectedOption(null);
    setShowFeedback(false);

    if (currentIdx + 1 >= questions.length) {
      // All done - analyze
      setPhase("analyzing");
      await analyzeResults();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const analyzeResults = async () => {
    const subjectMap: Record<string, SubjectScore> = {};
    answers.forEach(a => {
      if (!subjectMap[a.subjectId]) {
        subjectMap[a.subjectId] = { name: a.subjectName, correct: 0, total: 0, percentage: 0 };
      }
      subjectMap[a.subjectId].total++;
      if (a.isCorrect) subjectMap[a.subjectId].correct++;
    });

    const subjectScores = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const score = Math.round((totalCorrect / answers.length) * 100);
    const weakSubjects = subjectScores.filter(s => s.percentage < 60).map(s => s.name);
    const strongSubjects = subjectScores.filter(s => s.percentage >= 70).map(s => s.name);

    const resultData = { score, subjectScores, weakSubjects, strongSubjects };
    setResults(resultData);

    // Save to database
    if (user) {
      // Save diagnostic results
      await supabase.from("diagnostic_results").insert({
        user_id: user.id,
        total_questions: answers.length,
        total_correct: totalCorrect,
        score,
        subject_scores: subjectScores as any,
        weak_subjects: weakSubjects,
        strong_subjects: strongSubjects,
      });

      // Also save individual answers
      for (const a of answers) {
        await supabase.from("user_answers").insert({
          user_id: user.id,
          question_id: a.questionId,
          selected_option_id: a.optionId,
          is_correct: a.isCorrect,
        });
      }

      // Mark diagnostic as completed
      await supabase.from("profiles").update({ diagnostic_completed: true }).eq("user_id", user.id);
    }

    setPhase("results");
  };

  const question = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100 : 0;

  if (phase === "intro") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="glass-card max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/20">
              <Crosshair className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold">Diagnóstico Inicial</h1>
              <p className="text-muted-foreground leading-relaxed">
                Vamos avaliar seu conhecimento em {questions.length > 0 ? `${questions.length} questões rápidas` : "algumas questões"}. 
                A IA vai usar o resultado para montar seu plano de estudos personalizado.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 justify-center">
                <Target className="w-4 h-4 text-primary" /> ~10 minutos
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Brain className="w-4 h-4 text-primary" /> Detecta pontos fracos
              </div>
              <div className="flex items-center gap-2 justify-center">
                <BookOpen className="w-4 h-4 text-primary" /> Personaliza seu dashboard
              </div>
            </div>
            <Button
              size="lg"
              className="gradient-primary text-primary-foreground h-12 px-8 shadow-lg shadow-primary/20"
              onClick={() => setPhase("quiz")}
              disabled={loading || questions.length === 0}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...</>
              ) : questions.length === 0 ? (
                "Sem questões disponíveis"
              ) : (
                <>Iniciar Diagnóstico <ChevronRight className="w-5 h-5 ml-1" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-xl animate-pulse-soft">
            <Brain className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold">Analisando seu desempenho...</h2>
          <p className="text-muted-foreground">A IA está identificando seus pontos fortes e fracos.</p>
        </div>
      </div>
    );
  }

  if (phase === "results" && results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4 animate-fade-in">
        <Card className="glass-card">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-gold flex items-center justify-center shadow-xl shadow-accent/20 mb-4">
              <Target className="w-8 h-8 text-background" />
            </div>
            <CardTitle className="font-heading text-2xl">Resultado do Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-heading font-extrabold font-mono bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {results.score}%
              </p>
              <p className="text-muted-foreground text-sm mt-1">Taxa de acerto geral</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Desempenho por Matéria</h3>
              {results.subjectScores.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="font-mono">{s.correct}/{s.total} ({s.percentage}%)</span>
                  </div>
                  <Progress value={s.percentage} className="h-2" />
                </div>
              ))}
            </div>

            {results.weakSubjects.length > 0 && (
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" /> Pontos Fracos — Prioridade
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.weakSubjects.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {results.strongSubjects.length > 0 && (
              <div className="p-4 rounded-xl bg-[hsl(152,69%,42%)]/5 border border-[hsl(152,69%,42%)]/20 space-y-2">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[hsl(152,69%,42%)]" /> Pontos Fortes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.strongSubjects.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-[hsl(152,69%,42%)]/30 text-[hsl(152,69%,42%)]">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full gradient-primary text-primary-foreground h-12 shadow-lg shadow-primary/20"
              onClick={() => navigate("/dashboard")}
            >
              Ir para o Dashboard <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz phase
  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Questão {currentIdx + 1} de {questions.length}</span>
          <Badge variant="outline" className="text-xs">{question.subject_name}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <p className="text-foreground leading-relaxed">{question.statement}</p>

          <div className="space-y-3">
            {question.options.map((opt) => {
              let optClass = "glass-card p-4 cursor-pointer transition-all hover:border-primary/40";
              if (showFeedback) {
                if (opt.is_correct) optClass = "p-4 border rounded-xl bg-[hsl(152,69%,42%)]/10 border-[hsl(152,69%,42%)]/30";
                else if (opt.id === selectedOption && !opt.is_correct) optClass = "p-4 border rounded-xl bg-destructive/10 border-destructive/30";
                else optClass = "p-4 border rounded-xl border-border/40 opacity-50";
              } else if (opt.id === selectedOption) {
                optClass = "p-4 border rounded-xl border-primary/50 bg-primary/5";
              }

              return (
                <button
                  key={opt.id}
                  className={`w-full text-left ${optClass}`}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={showFeedback}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-heading font-bold text-sm text-muted-foreground shrink-0">{opt.label})</span>
                    <span className="text-sm">{opt.text}</span>
                    {showFeedback && opt.is_correct && <CheckCircle className="w-4 h-4 text-[hsl(152,69%,42%)] shrink-0 ml-auto" />}
                    {showFeedback && opt.id === selectedOption && !opt.is_correct && <XCircle className="w-4 h-4 text-destructive shrink-0 ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={nextQuestion}
            >
              {currentIdx + 1 >= questions.length ? "Ver Resultado" : "Próxima"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
