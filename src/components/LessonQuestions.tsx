/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, ChevronRight, RotateCcw,
  HelpCircle, MessageSquare, Trophy, Lock, Zap, Sparkles, Award, ChevronUp, AlertTriangle, Filter
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LessonQuestionsProps {
  lessonId: string;
}

export default function LessonQuestions({ lessonId }: LessonQuestionsProps) {
  const { user } = useAuth();
  const { questionLimit } = useSubscription();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, any[]>>({});
  const [answeredMap, setAnsweredMap] = useState<Record<string, { optionId: string; isCorrect: boolean }>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!lessonId || !user) return;

    const load = async () => {
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("lesson_id", lessonId);

      if (!qs || qs.length === 0) { setQuestions([]); return; }
      setQuestions(qs);

      const qIds = qs.map(q => q.id);

      // Load options for all questions
      const { data: opts } = await supabase
        .from("question_options")
        .select("*")
        .in("question_id", qIds);

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
        .eq("user_id", user.id)
        .in("question_id", qIds);

      const aMap: Record<string, { optionId: string; isCorrect: boolean }> = {};
      const revealed = new Set<string>();
      let correct = 0;
      (answers ?? []).forEach(a => {
        aMap[a.question_id] = { optionId: a.selected_option_id!, isCorrect: a.is_correct };
        revealed.add(a.question_id);
        if (a.is_correct) correct++;
      });
      setAnsweredMap(aMap);
      setRevealedQuestions(revealed);
      setStats({ total: answers?.length ?? 0, correct });
    };

    load();
  }, [lessonId, user]);

  const loadQuestions = async () => {
    if (!lessonId || !user) return;
    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("lesson_id", lessonId);

    if (!qs || qs.length === 0) { setQuestions([]); return; }
    setQuestions(qs);

    const qIds = qs.map(q => q.id);

    const { data: opts } = await supabase
      .from("question_options")
      .select("*")
      .in("question_id", qIds);

    const oMap: Record<string, any[]> = {};
    (opts ?? []).forEach(o => {
      if (!oMap[o.question_id]) oMap[o.question_id] = [];
      oMap[o.question_id].push(o);
    });
    setOptionsMap(oMap);

    const { data: answers } = await supabase
      .from("user_answers")
      .select("question_id, selected_option_id, is_correct")
      .eq("user_id", user.id)
      .in("question_id", qIds);

    const aMap: Record<string, { optionId: string; isCorrect: boolean }> = {};
    const revealed = new Set<string>();
    let correct = 0;
    (answers ?? []).forEach(a => {
      aMap[a.question_id] = { optionId: a.selected_option_id!, isCorrect: a.is_correct };
      revealed.add(a.question_id);
      if (a.is_correct) correct++;
    });
    setAnsweredMap(aMap);
    setRevealedQuestions(revealed);
    setStats({ total: answers?.length ?? 0, correct });
  };

  const handleReset = async () => {
    if (!user || !lessonId) return;
    setIsResetting(true);
    try {
      const qIds = questions.map(q => q.id);
      if (qIds.length === 0) return;

      const { error: ansError } = await supabase
        .from("user_answers")
        .delete()
        .eq("user_id", user.id)
        .in("question_id", qIds);

      const { error: revError } = await supabase
        .from("review_queue")
        .delete()
        .eq("user_id", user.id)
        .in("question_id", qIds);

      if (ansError || revError) throw new Error("Erro ao limpar progresso");

      toast.success("Histórico de questões limpo com sucesso!");
      await loadQuestions();
      setSelectedAnswers({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAnswer = async (questionId: string, optionId: string) => {
    if (!user || revealedQuestions.has(questionId)) return;
    const opt = optionsMap[questionId]?.find(o => o.id === optionId);
    if (!opt) return;

    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    setRevealedQuestions(prev => new Set(prev).add(questionId));
    setAnsweredMap(prev => ({
      ...prev,
      [questionId]: { optionId, isCorrect: opt.is_correct },
    }));
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (opt.is_correct ? 1 : 0),
    }));

    await supabase.from("user_answers").insert({
      user_id: user.id,
      question_id: questionId,
      selected_option_id: optionId,
      is_correct: opt.is_correct,
    });

    if (!opt.is_correct) {
      await supabase.from("review_queue").upsert({
        user_id: user.id,
        question_id: questionId,
        source: "wrong_answer",
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        next_review_at: new Date().toISOString(),
      }, { onConflict: "user_id,question_id" });
    }
  };

  if (questions.length === 0) return (
    <div className="p-4 rounded-xl border border-border bg-muted/30 text-center">
      <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
      <p className="text-sm text-muted-foreground">Nenhuma questão disponível para este assunto ainda.</p>
      <p className="text-xs text-muted-foreground mt-1">As questões serão adicionadas em breve.</p>
    </div>
  );

  const answeredCount = revealedQuestions.size;
  const pct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const filteredQuestions = questions.filter(q => {
    if (filter === "all") return true;
    return q.difficulty === filter;
  });

  const isLimitReached = questionLimit !== -1 && stats.total >= questionLimit;

  if (isLimitReached) {
    return (
      <Card className="glass-card border-accent/20 p-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl gradient-gold flex items-center justify-center mx-auto shadow-2xl">
          <Lock className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold">Limite Diário Atingido</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Como aluno gratuito, você pode responder até 10 questões por dia. Ganhe acesso ilimitado sendo Premium!
          </p>
        </div>
        <Button onClick={() => navigate("/assinatura")} className="gradient-gold font-bold h-12 px-8 rounded-xl">
          Ganhar Acesso Ilimitado
        </Button>
      </Card>
    );
  }

  const isFullyComplete = questions.length > 0 && answeredCount === questions.length;
  const allCorrect = isFullyComplete && stats.correct === stats.total;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 shadow-lg ${isFullyComplete
          ? "bg-gradient-to-r from-[hsl(var(--chart-4))]/10 to-primary/5 border-[hsl(var(--chart-4))]/30"
          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
          }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isFullyComplete ? "bg-[hsl(var(--chart-4))]/20" : "bg-primary/10"
            }`}>
            {isFullyComplete ? (
              <Award className="w-6 h-6 text-[hsl(var(--chart-4))]" />
            ) : (
              <HelpCircle className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="text-left">
            <p className="font-heading font-bold text-base">Desafio da Aula</p>
            <p className="text-xs text-muted-foreground font-medium">
              {answeredCount}/{questions.length} respondidas
              {stats.total > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-muted/50">
                  {stats.correct}/{stats.total} acertos
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isFullyComplete && (
            <Badge className="bg-[hsl(var(--chart-4))] text-white border-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider gap-1.5 animate-pulse">
              <Sparkles className="w-3 h-3" /> Finalizado
            </Badge>
          )}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-lg bg-background/30 backdrop-blur-sm">
            {questions.map(q => {
              const ans = answeredMap[q.id];
              return (
                <div
                  key={q.id}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${ans ? (ans.isCorrect ? "bg-[hsl(var(--chart-4))] scale-110 shadow-[0_0_8px_hsl(var(--chart-4))]" : "bg-destructive") : "bg-muted"
                    }`}
                />
              );
            })}
          </div>
          <motion.div
            animate={{ rotate: expanded ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="overflow-hidden space-y-4"
          >
            {/* Completion Banner */}
            {isFullyComplete && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-[hsl(var(--chart-4))]/10 border border-primary/20 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Award className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-heading font-bold mb-1 flex items-center justify-center md:justify-start gap-2">
                      {allCorrect ? "Excelência Total! 🏆" : "Aula Concluída! ✅"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {allCorrect
                        ? "Você dominou completamente este tópico. Seu desempenho foi impecável!"
                        : `Você acertou ${stats.correct} de ${questions.length} questões. Continue praticando para atingir a perfeição.`}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="lg"
                        variant="default"
                        className="rounded-xl gradient-primary font-bold shadow-xl shadow-primary/20 gap-2 hover:scale-105 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-5 h-5" /> Refazer Questões
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-primary/20">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-xl font-heading">
                          <AlertTriangle className="w-6 h-6 text-destructive" /> Reiniciar Desafio?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          Isso apagará seu histórico atual de respostas para esta aula. Você está pronto para tentar novamente?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90 rounded-xl px-6">
                          Sim, Reiniciar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            )}

            {/* Controls Bar */}
            {!isFullyComplete && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-background/40 backdrop-blur-md border border-border/50 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-muted-foreground mx-2" />
                  {["all", "easy", "medium", "hard"].map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className={`h-8 text-[11px] font-bold uppercase tracking-tight px-3 rounded-lg transition-all ${filter === f ? "shadow-md shadow-primary/20" : "text-muted-foreground"
                        }`}
                    >
                      {f === "all" ? "Todas" : f === "easy" ? "Fáceis" : f === "medium" ? "Médias" : "Difíceis"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center border border-dashed rounded-2xl bg-muted/10"
                >
                  <p className="text-muted-foreground font-medium">Nenhuma questão disponível para este filtro.</p>
                </motion.div>
              ) : (
                filteredQuestions.map((q, filteredIdx) => {
                  const originalIdx = questions.indexOf(q);
                  const options = optionsMap[q.id] ?? [];
                  const answered = answeredMap[q.id];
                  const isRevealed = revealedQuestions.has(q.id);

                  return (
                    <motion.div
                      layout
                      key={q.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: filteredIdx * 0.05 }}
                    >
                      <Card className={`glass-card overflow-hidden transition-all duration-500 border-2 ${answered
                        ? (answered.isCorrect
                          ? "border-[hsl(var(--chart-4))]/40 bg-[hsl(var(--chart-4))]/5"
                          : "border-destructive/30 bg-destructive/5")
                        : "border-border/40 hover:border-primary/30"
                        }`}>
                        <CardContent className="p-6 space-y-5">
                          {/* Question header */}
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-mono font-bold shadow-inner ${answered
                              ? (answered.isCorrect
                                ? "bg-[hsl(var(--chart-4))] text-white"
                                : "bg-destructive text-white")
                              : "bg-primary/10 text-primary"
                              }`}>
                              {String(originalIdx + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-[15px] font-semibold leading-relaxed text-foreground/90">
                                {q.statement}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {q.difficulty && (
                                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 bg-muted/40 text-muted-foreground border-0">
                                    {q.difficulty === "easy" ? "Fácil" : q.difficulty === "hard" ? "Difícil" : "Médio"}
                                  </Badge>
                                )}
                                {answered && (
                                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                    <Badge className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 border-0 ${answered.isCorrect ? "bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))]" : "bg-destructive/20 text-destructive"
                                      }`}>
                                      {answered.isCorrect ? "Correta" : "Incorreta"}
                                    </Badge>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="space-y-2.5 pl-14">
                            {options.map((opt, optIdx) => {
                              const isSelected = answered?.optionId === opt.id;
                              const showCorrect = isRevealed && opt.is_correct;
                              const showWrong = isRevealed && isSelected && !opt.is_correct;

                              let optStyles = "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ";
                              if (isRevealed) {
                                if (opt.is_correct) optStyles += "border-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10 shadow-lg shadow-[hsl(var(--chart-4))]/10 ";
                                else if (isSelected) optStyles += "border-destructive bg-destructive/10 ";
                                else optStyles += "border-transparent bg-muted/10 opacity-60 ";
                              } else {
                                optStyles += "border-border/30 bg-muted/5 hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5 shadow-sm ";
                              }

                              return (
                                <motion.div
                                  key={opt.id}
                                  whileHover={!isRevealed ? { x: 4 } : {}}
                                  whileTap={!isRevealed ? { scale: 0.98 } : {}}
                                  className={optStyles}
                                  onClick={() => handleAnswer(q.id, opt.id)}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-colors font-mono font-bold text-xs ${isRevealed && opt.is_correct ? "bg-white text-[hsl(var(--chart-4))] border-white" : "border-muted-foreground/30 text-muted-foreground group-hover:text-primary group-hover:border-primary/50"
                                      }`}>
                                      {opt.label}
                                    </div>
                                    <span className={`flex-1 text-sm font-medium ${isRevealed && opt.is_correct ? "text-[hsl(var(--chart-4))] font-bold" : ""}`}>
                                      {opt.text}
                                    </span>
                                    {isRevealed && (
                                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        {opt.is_correct ? <CheckCircle className="w-5 h-5 text-[hsl(var(--chart-4))]" /> : isSelected ? <XCircle className="w-5 h-5 text-destructive" /> : null}
                                      </motion.div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          <AnimatePresence>
                            {isRevealed && q.explanation && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="ml-14 p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-inner"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Insight do Especialista</p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed italic">
                                  {q.explanation}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
