/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Brain, CheckCircle, XCircle, Clock, Loader2,
  RotateCcw, Flame, Trophy, ChevronRight
} from "lucide-react";
import PremiumGate from "@/components/PremiumGate";

type ReviewItem = {
  id: string;
  question_id: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  next_review_at: string;
  source: string;
  question?: {
    id: string;
    statement: string;
    explanation: string | null;
    subject_id: string;
  };
  options?: { id: string; label: string; text: string; is_correct: boolean }[];
  subject_name?: string;
};

export default function Revisoes() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState<ReviewItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchPendingReviews();
  }, [user]);

  const fetchPendingReviews = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const { data: reviews, count } = await supabase
      .from("review_queue")
      .select("*", { count: "exact" })
      .eq("user_id", user!.id)
      .lte("next_review_at", now)
      .order("next_review_at")
      .limit(20);

    if (!reviews || reviews.length === 0) {
      setPendingReviews([]);
      setTotalPending(0);
      setLoading(false);
      return;
    }

    setTotalPending(count ?? reviews.length);

    const questionIds = reviews.map(r => r.question_id);
    const [questionsRes, optionsRes, subjectsRes] = await Promise.all([
      supabase.from("questions").select("id, statement, explanation, subject_id").in("id", questionIds),
      supabase.from("question_options").select("*").in("question_id", questionIds),
      supabase.from("subjects").select("id, name"),
    ]);

    const questions = questionsRes.data ?? [];
    const options = optionsRes.data ?? [];
    const subjects = subjectsRes.data ?? [];

    const enriched: ReviewItem[] = reviews.map(r => {
      const q = questions.find(q => q.id === r.question_id);
      const opts = options.filter(o => o.question_id === r.question_id);
      const subName = subjects.find(s => s.id === q?.subject_id)?.name ?? "";
      return { ...r, question: q as any, options: opts, subject_name: subName };
    });

    setPendingReviews(enriched);
    setLoading(false);
  };

  const startReview = () => {
    setReviewing(true);
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setStats({ total: 0, correct: 0 });
  };

  const handleAnswer = async (optionId: string) => {
    if (answered || !user) return;
    setSelected(optionId);
    setAnswered(true);

    const review = pendingReviews[currentIdx];
    const opt = review.options?.find(o => o.id === optionId);
    const isCorrect = opt?.is_correct ?? false;

    await supabase.from("user_answers").insert({
      user_id: user.id,
      question_id: review.question_id,
      selected_option_id: optionId,
      is_correct: isCorrect,
    });

    let { ease_factor, interval_days, repetitions } = review;
    if (isCorrect) {
      repetitions += 1;
      if (repetitions === 1) interval_days = 1;
      else if (repetitions === 2) interval_days = 6;
      else interval_days = Math.round(interval_days * ease_factor);
      ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02));
    } else {
      repetitions = 0;
      interval_days = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
    }

    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval_days);

    await supabase.from("review_queue").update({
      interval_days, ease_factor, repetitions,
      next_review_at: next_review_at.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    }).eq("id", review.id);

    setStats(prev => ({ total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) }));
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < pendingReviews.length) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setReviewing(false);
      toast.success(`Revisão concluída! ${stats.correct}/${stats.total} acertos`);
      fetchPendingReviews();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Premium gate for free users
  if (!isActive) {
    return <PremiumGate feature="Revisões Espaçadas"><></></PremiumGate>;
  }

  // Review in progress
  if (reviewing && pendingReviews.length > 0) {
    const review = pendingReviews[currentIdx];
    const q = review.question;
    if (!q) return null;

    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setReviewing(false)}>← Sair</Button>
          <span className="text-sm text-muted-foreground font-mono">
            {currentIdx + 1}/{pendingReviews.length} • {stats.correct}/{stats.total} acertos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{review.subject_name}</Badge>
          <Badge variant="secondary" className="text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Revisão #{review.repetitions + 1}
          </Badge>
        </div>

        <Card className="glass-card">
          <CardContent className="p-6 space-y-6">
            <p className="font-medium text-lg">{q.statement}</p>
            <div className="space-y-3">
              {review.options?.map(opt => {
                let classes = "glass-card p-4 cursor-pointer transition-colors";
                if (answered) {
                  if (opt.is_correct) classes += " border-[hsl(152,69%,42%)]/50 bg-[hsl(152,69%,42%)]/10";
                  else if (opt.id === selected && !opt.is_correct) classes += " border-destructive/50 bg-destructive/10";
                } else {
                  classes += " hover:border-primary/30";
                }
                return (
                  <div key={opt.id} className={classes} onClick={() => handleAnswer(opt.id)}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary">{opt.label})</span>
                      <span>{opt.text}</span>
                      {answered && opt.is_correct && <CheckCircle className="w-4 h-4 text-[hsl(152,69%,42%)] ml-auto" />}
                      {answered && opt.id === selected && !opt.is_correct && <XCircle className="w-4 h-4 text-destructive ml-auto" />}
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
                {currentIdx + 1 < pendingReviews.length ? "Próxima Revisão" : "Finalizar Revisão"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview screen
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[hsl(280,70%,55%)]/10 flex items-center justify-center shadow-lg">
          <Brain className="w-7 h-7 text-[hsl(280,70%,55%)]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Revisões Pendentes</h1>
          <p className="text-muted-foreground text-sm">Sistema de repetição espaçada para fixar o conteúdo</p>
        </div>
      </div>

      {totalPending > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes Hoje</p>
                  <p className="text-lg font-heading font-bold font-mono">{totalPending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matérias</p>
                  <p className="text-lg font-heading font-bold font-mono">
                    {new Set(pendingReviews.map(r => r.subject_name)).size}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(152,69%,42%)]/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[hsl(152,69%,42%)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo Estimado</p>
                  <p className="text-lg font-heading font-bold font-mono">~{Math.ceil(totalPending * 1.5)}min</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card overflow-hidden">
            <CardContent className="p-8 text-center space-y-4">
              <Brain className="w-12 h-12 mx-auto text-[hsl(280,70%,55%)]" />
              <h2 className="font-heading text-xl font-bold">
                Você tem {totalPending} {totalPending === 1 ? "questão" : "questões"} para revisar
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Revisões espaçadas são a forma mais eficaz de memorizar conteúdo.
              </p>
              <Button onClick={startReview} size="lg" className="gradient-primary text-primary-foreground h-12 px-8">
                <Brain className="w-5 h-5 mr-2" /> Iniciar Revisão
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-heading text-sm font-semibold text-muted-foreground">Questões na fila</h3>
            {pendingReviews.slice(0, 5).map(r => (
              <Card key={r.id} className="glass-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate flex-1">{r.question?.statement}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{r.subject_name}</Badge>
                </CardContent>
              </Card>
            ))}
            {totalPending > 5 && (
              <p className="text-xs text-muted-foreground text-center">+ {totalPending - 5} mais questões</p>
            )}
          </div>
        </>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-12 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-[hsl(152,69%,42%)]" />
            <h2 className="font-heading text-xl font-bold">Tudo em dia! 🎉</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Nenhuma revisão pendente. Continue estudando e respondendo questões.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
