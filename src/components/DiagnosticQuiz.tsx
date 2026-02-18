/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crosshair, ChevronRight, CheckCircle, XCircle, Brain, Target,
  BookOpen, Loader2, Shield, Zap, Timer, TrendingUp, Award, Flame,
  ChevronDown, Sparkles,
} from "lucide-react";

type DiagnosticQuestion = {
  id: string;
  statement: string;
  subject_id: string;
  subject_name: string;
  difficulty: string;
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
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string; isCorrect: boolean; subjectId: string; subjectName: string; timeSpent: number }[]>([]);
  const [results, setResults] = useState<{ score: number; subjectScores: SubjectScore[]; weakSubjects: string[]; strongSubjects: string[]; avgTime: number; readiness: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Check if user already completed diagnostic
  useEffect(() => {
    if (!user) return;
    supabase.from("diagnostic_results").select("id").eq("user_id", user.id).limit(1).then(({ data }) => {
      if (data && data.length > 0) setHasExisting(true);
    });
  }, [user]);

  useEffect(() => { loadQuestions(); }, []);

  // Timer for current question
  useEffect(() => {
    if (phase !== "quiz" || showFeedback) return;
    const interval = setInterval(() => setElapsed(Date.now() - questionStartTime), 100);
    return () => clearInterval(interval);
  }, [phase, questionStartTime, showFeedback]);

  const loadQuestions = async () => {
    setLoading(true);
    const { data: subjects } = await supabase.from("subjects").select("id, name").order("order_index");
    if (!subjects || subjects.length === 0) {
      toast.error("Nenhuma matéria encontrada.");
      setLoading(false);
      return;
    }

    const allQuestions: DiagnosticQuestion[] = [];
    for (const subject of subjects) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, statement, subject_id, difficulty")
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
            allQuestions.push({ ...q, difficulty: q.difficulty || "medium", subject_name: subject.name, options: opts });
          }
        }
      }
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15);
    setQuestions(shuffled);
    setLoading(false);
  };

  const startQuiz = () => {
    setPhase("quiz");
    setQuestionStartTime(Date.now());
    setElapsed(0);
  };

  const handleAnswer = (optionId: string) => {
    if (showFeedback) return;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setSelectedOption(optionId);
    const question = questions[currentIdx];
    const isCorrect = question.options.find(o => o.id === optionId)?.is_correct ?? false;
    setShowFeedback(true);
    setAnswers(prev => [...prev, { questionId: question.id, optionId, isCorrect, subjectId: question.subject_id, subjectName: question.subject_name, timeSpent }]);
  };

  const nextQuestion = async () => {
    setSelectedOption(null);
    setShowFeedback(false);
    if (currentIdx + 1 >= questions.length) {
      setPhase("analyzing");
      await analyzeResults();
    } else {
      setCurrentIdx(prev => prev + 1);
      setQuestionStartTime(Date.now());
      setElapsed(0);
    }
  };

  const analyzeResults = async () => {
    // Animated analysis steps
    const steps = ["Calculando precisão...", "Mapeando pontos fracos...", "Analisando tempo de resposta...", "Gerando plano personalizado..."];
    for (let i = 0; i < steps.length; i++) {
      setAnalyzeStep(i);
      await new Promise(r => setTimeout(r, 800));
    }

    const subjectMap: Record<string, SubjectScore> = {};
    answers.forEach(a => {
      if (!subjectMap[a.subjectId]) subjectMap[a.subjectId] = { name: a.subjectName, correct: 0, total: 0, percentage: 0 };
      subjectMap[a.subjectId].total++;
      if (a.isCorrect) subjectMap[a.subjectId].correct++;
    });

    const subjectScores = Object.values(subjectMap).map(s => ({ ...s, percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }));
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const score = Math.round((totalCorrect / answers.length) * 100);
    const weakSubjects = subjectScores.filter(s => s.percentage < 60).map(s => s.name);
    const strongSubjects = subjectScores.filter(s => s.percentage >= 70).map(s => s.name);
    const avgTime = Math.round(answers.reduce((s, a) => s + a.timeSpent, 0) / answers.length);

    // Readiness index: accuracy 50%, speed 25%, coverage 25%
    const speedScore = Math.max(0, 100 - (avgTime - 15) * 3); // 15s ideal
    const coverageScore = Math.round((subjectScores.filter(s => s.percentage >= 50).length / Math.max(subjectScores.length, 1)) * 100);
    const readiness = Math.round(score * 0.5 + Math.min(speedScore, 100) * 0.25 + coverageScore * 0.25);

    const resultData = { score, subjectScores, weakSubjects, strongSubjects, avgTime, readiness: Math.min(readiness, 100) };
    setResults(resultData);

    if (user) {
      await supabase.from("diagnostic_results").insert({
        user_id: user.id, total_questions: answers.length, total_correct: totalCorrect,
        score, subject_scores: subjectScores as any, weak_subjects: weakSubjects, strong_subjects: strongSubjects,
        recommendations: { avgTime, readiness: resultData.readiness } as any,
      });

      const answerInserts = answers.map(a => ({
        user_id: user.id, question_id: a.questionId, selected_option_id: a.optionId, is_correct: a.isCorrect,
      }));
      await supabase.from("user_answers").insert(answerInserts);
      await supabase.from("profiles").update({ diagnostic_completed: true }).eq("user_id", user.id);
    }

    setPhase("results");
  };

  const question = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100 : 0;
  const correctSoFar = answers.filter(a => a.isCorrect).length;
  const elapsedSeconds = Math.floor(elapsed / 1000);

  // ─── INTRO ───
  if (phase === "intro") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 animate-fade-in">
          {/* Hero icon with pulse ring */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-2xl gradient-primary opacity-20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30">
              <Crosshair className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 mx-auto">
              <Shield className="w-3 h-3 mr-1" /> Avaliação Inteligente
            </Badge>
            <h1 className="font-heading text-3xl font-bold leading-tight">
              {hasExisting ? "Refazer Diagnóstico" : "Diagnóstico de Combate"}
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {hasExisting
                ? "Refaça o diagnóstico para recalibrar seu plano de estudos com base na sua evolução."
                : "Uma avaliação tática para mapear suas forças e fraquezas. A IA vai calibrar todo o seu treinamento a partir daqui."}
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Timer, label: "~10 minutos", desc: "Rápido e preciso" },
              { icon: Brain, label: "IA Adaptativa", desc: "Analisa padrões" },
              { icon: Target, label: "Mapa de forças", desc: "Por matéria" },
              { icon: Sparkles, label: "Plano customizado", desc: "Pós-diagnóstico" },
            ].map((f, i) => (
              <div key={i} className="glass-card p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-heading font-semibold">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {questions.length > 0 && (
            <div className="text-center text-xs text-muted-foreground">
              <span className="font-mono text-primary font-semibold">{questions.length}</span> questões selecionadas de{" "}
              <span className="font-mono text-primary font-semibold">{new Set(questions.map(q => q.subject_name)).size}</span> matérias
            </div>
          )}

          <Button
            size="lg"
            className="w-full gradient-primary text-primary-foreground h-14 text-base shadow-xl shadow-primary/25 font-heading font-bold"
            onClick={startQuiz}
            disabled={loading || questions.length === 0}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Preparando avaliação...</>
            ) : questions.length === 0 ? (
              "Sem questões disponíveis"
            ) : (
              <><Zap className="w-5 h-5 mr-2" /> {hasExisting ? "Iniciar Novo Diagnóstico" : "Iniciar Diagnóstico"}</>
            )}
          </Button>

          {hasExisting && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── ANALYZING ───
  if (phase === "analyzing") {
    const analyzeSteps = [
      { label: "Calculando precisão", icon: Target },
      { label: "Mapeando pontos fracos", icon: Brain },
      { label: "Analisando velocidade", icon: Timer },
      { label: "Gerando plano personalizado", icon: Sparkles },
    ];

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-8 animate-fade-in">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-2xl gradient-primary opacity-30 animate-pulse-soft" />
            <div className="relative w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
              <Brain className="w-10 h-10 text-primary-foreground animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold">Processando Inteligência</h2>
            <p className="text-sm text-muted-foreground">A IA está analisando cada resposta...</p>
          </div>

          <div className="space-y-3">
            {analyzeSteps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${i < analyzeStep ? "bg-primary/10 border border-primary/20" :
                    i === analyzeStep ? "bg-primary/5 border border-primary/10 animate-pulse-soft" :
                      "opacity-30"
                  }`}
              >
                <step.icon className={`w-4 h-4 ${i <= analyzeStep ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">{step.label}</span>
                {i < analyzeStep && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                {i === analyzeStep && <Loader2 className="w-4 h-4 text-primary ml-auto animate-spin" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ───
  if (phase === "results" && results) {
    const getReadinessColor = (v: number) => v >= 70 ? "text-[hsl(var(--success))]" : v >= 40 ? "text-accent" : "text-destructive";
    const getReadinessLabel = (v: number) => v >= 80 ? "Pronto para combate!" : v >= 60 ? "Em treinamento avançado" : v >= 40 ? "Requer reforço" : "Início de campanha";

    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4 animate-fade-in">
        {/* Hero result card */}
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <CardContent className="relative p-6 md:p-8 space-y-6">
            {/* Readiness ring */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeDasharray={`${results.readiness * 3.267} 326.7`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-heading font-extrabold font-mono">{results.readiness}%</span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">prontidão</span>
                </div>
              </div>
              <div className="text-center">
                <p className={`font-heading font-bold ${getReadinessColor(results.readiness)}`}>
                  {getReadinessLabel(results.readiness)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {results.score}% de acerto • {results.avgTime}s tempo médio
                </p>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Acerto", value: `${results.score}%`, icon: Target, color: "text-primary" },
                { label: "Velocidade", value: `${results.avgTime}s`, icon: Timer, color: "text-accent" },
                { label: "Matérias", value: `${results.subjectScores.length}`, icon: BookOpen, color: "text-[hsl(var(--success))]" },
              ].map((s, i) => (
                <div key={i} className="glass-card p-3 text-center">
                  <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                  <p className="text-lg font-heading font-bold font-mono">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subject breakdown */}
        <Card className="glass-card">
          <CardContent className="p-5 space-y-4">
            <button
              onClick={() => setShowResultDetail(!showResultDetail)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Desempenho por Matéria
              </h3>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showResultDetail ? "rotate-180" : ""}`} />
            </button>

            {showResultDetail && (
              <div className="space-y-3 animate-fade-in">
                {results.subjectScores
                  .sort((a, b) => a.percentage - b.percentage)
                  .map((s, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2">
                          {s.percentage >= 70 ? (
                            <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                          ) : s.percentage >= 50 ? (
                            <Flame className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          )}
                          {s.name}
                        </span>
                        <span className="font-mono text-xs">{s.correct}/{s.total} ({s.percentage}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${s.percentage >= 70 ? "bg-[hsl(var(--success))]" :
                              s.percentage >= 50 ? "bg-accent" : "bg-destructive"
                            }`}
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak & Strong */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.weakSubjects.length > 0 && (
            <Card className="glass-card border-destructive/20">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider flex items-center gap-2 text-destructive">
                  <XCircle className="w-3.5 h-3.5" /> Prioridade Máxima
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {results.weakSubjects.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-destructive/30 text-destructive text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results.strongSubjects.length > 0 && (
            <Card className="glass-card border-[hsl(var(--success))]/20">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider flex items-center gap-2 text-[hsl(var(--success))]">
                  <Award className="w-3.5 h-3.5" /> Pontos Fortes
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {results.strongSubjects.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-[hsl(var(--success))]/30 text-[hsl(var(--success))] text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Button
          size="lg"
          className="w-full gradient-primary text-primary-foreground h-14 shadow-xl shadow-primary/25 font-heading font-bold text-base"
          onClick={() => navigate("/dashboard")}
        >
          <Zap className="w-5 h-5 mr-2" /> Começar Treinamento
        </Button>
      </div>
    );
  }

  // ─── QUIZ ───
  if (!question) return null;

  const difficultyLabel = { easy: "Fácil", medium: "Médio", hard: "Difícil" }[question.difficulty] || "Médio";
  const difficultyColor = { easy: "text-[hsl(var(--success))]", medium: "text-accent", hard: "text-destructive" }[question.difficulty] || "text-accent";

  return (
    <div className="max-w-2xl mx-auto p-3 md:p-4 space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-muted-foreground shrink-0">{currentIdx + 1}/{questions.length}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">{question.subject_name}</Badge>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${difficultyColor}`}>{difficultyLabel}</Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <Timer className="w-3 h-3" /> {elapsedSeconds}s
          </span>
          <span className="text-xs font-mono text-primary">
            {correctSoFar}/{answers.length} ✓
          </span>
        </div>
      </div>

      {/* Progress bar with gradient */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <Card className="glass-card">
        <CardContent className="p-5 md:p-6 space-y-5">
          <p className="text-foreground leading-relaxed font-medium">{question.statement}</p>

          <div className="space-y-2.5">
            {question.options.map((opt, optIdx) => {
              let optClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 ";
              if (showFeedback) {
                if (opt.is_correct) {
                  optClass += "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/40 shadow-[0_0_12px_-4px_hsl(var(--success)/0.3)]";
                } else if (opt.id === selectedOption && !opt.is_correct) {
                  optClass += "bg-destructive/10 border-destructive/40";
                } else {
                  optClass += "border-border/30 opacity-40";
                }
              } else {
                optClass += "border-border/60 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]";
              }

              return (
                <button
                  key={opt.id}
                  className={optClass}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={showFeedback}
                  style={{ animationDelay: `${optIdx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-heading font-bold ${showFeedback && opt.is_correct ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
                        showFeedback && opt.id === selectedOption ? "bg-destructive/20 text-destructive" :
                          "bg-muted text-muted-foreground"
                      }`}>
                      {opt.label}
                    </span>
                    <span className="text-sm pt-0.5">{opt.text}</span>
                    {showFeedback && opt.is_correct && <CheckCircle className="w-5 h-5 text-[hsl(var(--success))] shrink-0 ml-auto mt-0.5" />}
                    {showFeedback && opt.id === selectedOption && !opt.is_correct && <XCircle className="w-5 h-5 text-destructive shrink-0 ml-auto mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="pt-2 animate-fade-in">
              <Button
                className="w-full gradient-primary text-primary-foreground h-12 font-heading font-semibold"
                onClick={nextQuestion}
              >
                {currentIdx + 1 >= questions.length ? (
                  <><Brain className="w-4 h-4 mr-2" /> Gerar Resultado</>
                ) : (
                  <>Próxima <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
