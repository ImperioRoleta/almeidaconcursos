import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, XCircle, HelpCircle, Lock, AlertTriangle,
  ChevronRight, RotateCcw, BookOpen, Target, Award, Layers,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const FREE_DAILY_LIMIT = 10;

const subjectGradients = [
  "from-primary/20 to-[hsl(195,85%,48%)]/10",
  "from-accent/20 to-[hsl(38,92%,50%)]/10",
  "from-[hsl(152,69%,42%)]/20 to-[hsl(160,60%,50%)]/10",
  "from-[hsl(280,70%,55%)]/20 to-[hsl(320,75%,55%)]/10",
  "from-[hsl(25,95%,53%)]/20 to-[hsl(38,92%,50%)]/10",
  "from-[hsl(195,85%,48%)]/20 to-primary/10",
];

const subjectIconColors = [
  "text-primary", "text-accent", "text-[hsl(152,69%,42%)]",
  "text-[hsl(280,70%,55%)]", "text-[hsl(25,95%,53%)]", "text-[hsl(195,85%,48%)]",
];

export default function Questoes() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();

  // Subject list state
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questionCountBySubject, setQuestionCountBySubject] = useState<Record<string, number>>({});
  const [answeredBySubject, setAnsweredBySubject] = useState<Record<string, number>>({});
  const [correctBySubject, setCorrectBySubject] = useState<Record<string, number>>({});

  // Practice state
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [optionsMap, setOptionsMap] = useState<Record<string, any[]>>({});
  const [answeredMap, setAnsweredMap] = useState<Record<string, { optionId: string; isCorrect: boolean }>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [currentRevealed, setCurrentRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [todayCount, setTodayCount] = useState(0);

  // Load subjects
  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  // Load progress stats
  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      // All questions grouped by subject
      const { data: qs } = await supabase.from("questions").select("id, subject_id");
      if (!qs) return;

      const countBySubject: Record<string, number> = {};
      const qIdToSubject: Record<string, string> = {};
      qs.forEach(q => {
        countBySubject[q.subject_id] = (countBySubject[q.subject_id] || 0) + 1;
        qIdToSubject[q.id] = q.subject_id;
      });
      setQuestionCountBySubject(countBySubject);

      // User answers
      const { data: answers } = await supabase
        .from("user_answers")
        .select("question_id, is_correct")
        .eq("user_id", user.id);

      const answeredSet = new Set<string>();
      const answeredBySub: Record<string, number> = {};
      const correctBySub: Record<string, number> = {};
      (answers ?? []).forEach(a => {
        const subId = qIdToSubject[a.question_id];
        if (!subId) return;
        if (!answeredSet.has(a.question_id)) {
          answeredSet.add(a.question_id);
          answeredBySub[subId] = (answeredBySub[subId] || 0) + 1;
        }
        if (a.is_correct) correctBySub[subId] = (correctBySub[subId] || 0) + 1;
      });
      setAnsweredBySubject(answeredBySub);
      setCorrectBySubject(correctBySub);
    };
    loadStats();
  }, [user]);

  // Count today's answers for free users
  useEffect(() => {
    if (!user || isActive) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("user_answers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("answered_at", today.toISOString())
      .then(({ count }) => setTodayCount(count ?? 0));
  }, [user, isActive]);

  const dailyLimitReached = !isActive && todayCount >= FREE_DAILY_LIMIT;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - todayCount);

  const startPractice = async (subjectId: string) => {
    if (dailyLimitReached) {
      toast.error("Limite diário atingido! Faça upgrade para questões ilimitadas.");
      return;
    }
    setSelectedSubject(subjectId);
    let query = supabase.from("questions").select("*").eq("subject_id", subjectId);
    if (!isActive) query = query.eq("is_premium", false);
    const limit = isActive ? 50 : Math.min(remaining, 20);
    const { data } = await query.limit(limit);
    const qs = data ?? [];
    setQuestions(qs);
    setCurrentIdx(0);
    setSessionStats({ total: 0, correct: 0 });
    setCurrentAnswer(null);
    setCurrentRevealed(false);

    if (qs.length === 0) return;

    // Load all options
    const qIds = qs.map(q => q.id);
    const { data: opts } = await supabase.from("question_options").select("*").in("question_id", qIds);
    const oMap: Record<string, any[]> = {};
    (opts ?? []).forEach(o => {
      if (!oMap[o.question_id]) oMap[o.question_id] = [];
      oMap[o.question_id].push(o);
    });
    setOptionsMap(oMap);

    // Load existing answers
    const { data: answers } = await supabase
      .from("user_answers")
      .select("question_id, selected_option_id, is_correct")
      .eq("user_id", user!.id)
      .in("question_id", qIds);

    const aMap: Record<string, { optionId: string; isCorrect: boolean }> = {};
    (answers ?? []).forEach(a => {
      aMap[a.question_id] = { optionId: a.selected_option_id!, isCorrect: a.is_correct };
    });
    setAnsweredMap(aMap);

    // If first question already answered, show it revealed
    if (aMap[qs[0].id]) {
      setCurrentAnswer(aMap[qs[0].id].optionId);
      setCurrentRevealed(true);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (!user || currentRevealed) return;
    const q = questions[currentIdx];
    const opt = optionsMap[q.id]?.find(o => o.id === optionId);
    if (!opt) return;

    setCurrentAnswer(optionId);
    setCurrentRevealed(true);
    setAnsweredMap(prev => ({
      ...prev,
      [q.id]: { optionId, isCorrect: opt.is_correct },
    }));
    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (opt.is_correct ? 1 : 0),
    }));
    setTodayCount(prev => prev + 1);

    // Update subject answered count
    if (selectedSubject && !answeredMap[q.id]) {
      setAnsweredBySubject(prev => ({
        ...prev,
        [selectedSubject]: (prev[selectedSubject] || 0) + 1,
      }));
    }
    if (opt.is_correct && selectedSubject) {
      setCorrectBySubject(prev => ({
        ...prev,
        [selectedSubject]: (prev[selectedSubject] || 0) + 1,
      }));
    }

    await supabase.from("user_answers").insert({
      user_id: user.id,
      question_id: q.id,
      selected_option_id: optionId,
      is_correct: opt.is_correct,
    });

    if (!opt.is_correct) {
      await supabase.from("review_queue").upsert({
        user_id: user.id,
        question_id: q.id,
        source: "wrong_answer",
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      }, { onConflict: "user_id,question_id" });
    }
  };

  const goToQuestion = (idx: number) => {
    setCurrentIdx(idx);
    const q = questions[idx];
    if (answeredMap[q.id]) {
      setCurrentAnswer(answeredMap[q.id].optionId);
      setCurrentRevealed(true);
    } else {
      setCurrentAnswer(null);
      setCurrentRevealed(false);
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      goToQuestion(currentIdx + 1);
    } else {
      toast.success(`Prática finalizada! ${sessionStats.correct}/${sessionStats.total} acertos`);
      setSelectedSubject(null);
    }
  };

  const resetSubjectQuestions = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const { data: qs } = await supabase.from("questions").select("id").eq("subject_id", subjectId);
    if (!qs || qs.length === 0) return;
    const qIds = qs.map(q => q.id);
    const { error } = await supabase.from("user_answers").delete().eq("user_id", user.id).in("question_id", qIds);
    if (error) {
      toast.error("Erro ao resetar questões. Tente novamente.");
      return;
    }
    // Also delete from review_queue
    await supabase.from("review_queue").delete().eq("user_id", user.id).in("question_id", qIds);
    // Clear all local state
    setAnsweredBySubject(prev => ({ ...prev, [subjectId]: 0 }));
    setCorrectBySubject(prev => ({ ...prev, [subjectId]: 0 }));
    // Clear practice session state in case user re-enters
    setAnsweredMap(prev => {
      const next = { ...prev };
      qIds.forEach(id => delete next[id]);
      return next;
    });
    setSessionStats({ total: 0, correct: 0 });
    toast.success("Progresso resetado! Você pode recomeçar do zero.");
  };

  // ─── Breadcrumb ───
  const Breadcrumb = () => {
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setSelectedSubject(null)} className="hover:text-foreground transition-colors font-medium">
          Matérias
        </button>
        {selectedSubject && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{subjectName}</span>
          </>
        )}
      </div>
    );
  };

  // ─── Subject List ───
  if (!selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-primary" /> Questões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Pratique por matéria e acompanhe seu progresso</p>
        </div>

        {/* Daily limit banner */}
        {!isActive && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {dailyLimitReached ? "Limite diário atingido!" : `${remaining}/${FREE_DAILY_LIMIT} questões restantes hoje`}
                </p>
                <p className="text-xs text-muted-foreground">Faça upgrade para questões ilimitadas</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/assinatura")} className="gradient-primary text-primary-foreground shrink-0">
              Upgrade
            </Button>
          </div>
        )}

        {/* Subject grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {subjects.map((s, idx) => {
            const total = questionCountBySubject[s.id] || 0;
            const answered = answeredBySubject[s.id] || 0;
            const correct = correctBySubject[s.id] || 0;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
            const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
            const isComplete = total > 0 && pct === 100;
            const gradient = subjectGradients[idx % subjectGradients.length];
            const iconColor = subjectIconColors[idx % subjectIconColors.length];

            return (
              <Card
                key={s.id}
                className={`glass-card-hover cursor-pointer overflow-hidden group ${dailyLimitReached ? "opacity-50" : ""} ${isComplete ? "border-[hsl(var(--chart-4))]/30" : ""}`}
                onClick={() => startPractice(s.id)}
              >
                <CardContent className="p-0">
                  {s.image_url ? (
                    <div className="relative h-32 overflow-hidden">
                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                    </div>
                  ) : (
                    <div className={`h-20 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <HelpCircle className={`w-8 h-8 ${iconColor} opacity-40`} />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-heading font-bold text-base">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>}
                      </div>
                      {isComplete && <Award className="w-5 h-5 text-[hsl(var(--chart-4))] shrink-0" />}
                      {dailyLimitReached && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {total} questões</span>
                      {answered > 0 && (
                        <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {accuracy}% acerto</span>
                      )}
                    </div>

                    {total > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{answered}/{total} respondidas</span>
                          <span className={`font-semibold font-mono ${isComplete ? "text-[hsl(var(--chart-4))]" : "text-primary"}`}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        {isComplete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                            onClick={(e) => resetSubjectQuestions(s.id, e)}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar Questões
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Practice: No questions ───
  if (questions.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Breadcrumb />
        <p className="text-muted-foreground">Nenhuma questão disponível para esta matéria.</p>
      </div>
    );
  }

  // ─── Practice View ───
  const q = questions[currentIdx];
  const options = optionsMap[q.id] ?? [];
  const alreadyAnswered = answeredMap[q.id];

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />

      {/* Top stats bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-primary">{currentIdx + 1}<span className="text-muted-foreground text-sm font-normal">/{questions.length}</span></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Questão</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-[hsl(var(--chart-4))]">{sessionStats.correct}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acertos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-destructive">{sessionStats.total - sessionStats.correct}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Erros</p>
          </div>
          {sessionStats.total > 0 && (
            <div className="text-center">
              <p className="text-2xl font-heading font-bold">{Math.round((sessionStats.correct / sessionStats.total) * 100)}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full sm:w-48">
          <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />
        </div>
      </div>

      {/* Mini-map dots */}
      <div className="flex items-center gap-1 flex-wrap">
        {questions.map((qq, idx) => {
          const a = answeredMap[qq.id];
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={qq.id}
              onClick={() => goToQuestion(idx)}
              className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center ${
                isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110"
                  : a
                  ? a.isCorrect
                    ? "bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4))]/30"
                    : "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {a ? (a.isCorrect ? "✓" : "✗") : idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Question header */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold ${
              alreadyAnswered
                ? alreadyAnswered.isCorrect
                  ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]"
                  : "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}>
              {String(currentIdx + 1).padStart(2, "0")}
            </div>
            <div className="flex-1">
              <p className="font-medium text-lg leading-relaxed">{q.statement}</p>
              <div className="flex items-center gap-2 mt-2">
                {q.difficulty && (
                  <Badge variant="outline" className={`text-xs py-0.5 ${
                    q.difficulty === "easy" ? "border-[hsl(var(--chart-4))]/40 text-[hsl(var(--chart-4))]"
                    : q.difficulty === "hard" ? "border-destructive/40 text-destructive"
                    : "border-accent/40 text-accent"
                  }`}>
                    {q.difficulty === "easy" ? "Fácil" : q.difficulty === "hard" ? "Difícil" : "Médio"}
                  </Badge>
                )}
                {alreadyAnswered && (
                  <Badge className={`text-xs py-0.5 border-0 ${alreadyAnswered.isCorrect ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" : "bg-destructive/10 text-destructive"}`}>
                    {alreadyAnswered.isCorrect ? "Respondida ✓" : "Respondida ✗"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {options.map(opt => {
              let classes = "p-4 rounded-xl border-2 cursor-pointer transition-all";
              if (currentRevealed) {
                if (opt.is_correct) {
                  classes += " border-[hsl(var(--chart-4))]/60 bg-[hsl(var(--chart-4))]/5";
                } else if (opt.id === currentAnswer && !opt.is_correct) {
                  classes += " border-destructive/60 bg-destructive/5";
                } else {
                  classes += " border-border opacity-50";
                }
              } else {
                classes += " border-border hover:border-primary/40 hover:bg-primary/5 hover:translate-x-1";
              }

              return (
                <div key={opt.id} className={classes} onClick={() => handleAnswer(opt.id)}>
                  <div className="flex items-center gap-4">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                      currentRevealed && opt.is_correct
                        ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]"
                        : currentRevealed && opt.id === currentAnswer && !opt.is_correct
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {opt.label}
                    </span>
                    <span className="flex-1 text-sm">{opt.text}</span>
                    {currentRevealed && opt.is_correct && <CheckCircle className="w-5 h-5 text-[hsl(var(--chart-4))] shrink-0" />}
                    {currentRevealed && opt.id === currentAnswer && !opt.is_correct && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {currentRevealed && q.explanation && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm font-semibold text-primary mb-1">💡 Explicação:</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          {currentRevealed && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => currentIdx > 0 && goToQuestion(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="gap-2"
              >
                ← Anterior
              </Button>
              <Button onClick={nextQuestion} className="gradient-primary text-primary-foreground gap-2">
                {currentIdx + 1 < questions.length ? "Próxima Questão →" : "Finalizar Prática"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
