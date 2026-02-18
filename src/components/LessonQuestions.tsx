/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, Award,
} from "lucide-react";
import { toast } from "sonner";

interface LessonQuestionsProps {
  topicId: string;
}

export default function LessonQuestions({ topicId }: LessonQuestionsProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, any[]>>({});
  const [answeredMap, setAnsweredMap] = useState<Record<string, { optionId: string; isCorrect: boolean }>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [stats, setStats] = useState({ total: 0, correct: 0 });

  useEffect(() => {
    if (!topicId || !user) return;

    const load = async () => {
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("topic_id", topicId);

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
  }, [topicId, user]);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-heading font-semibold text-sm">Questões do Assunto</p>
            <p className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} respondidas
              {stats.total > 0 && ` • ${stats.correct}/${stats.total} acertos`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pct === 100 && (
            <Badge className="bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-0 text-xs gap-1">
              <Award className="w-3 h-3" /> Completo
            </Badge>
          )}
          {/* Mini progress dots */}
          <div className="hidden sm:flex items-center gap-1">
            {questions.map(q => (
              <div
                key={q.id}
                className={`w-2 h-2 rounded-full transition-colors ${answeredMap[q.id]
                    ? answeredMap[q.id].isCorrect
                      ? "bg-[hsl(var(--chart-4))]"
                      : "bg-destructive"
                    : "bg-muted"
                  }`}
              />
            ))}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const options = optionsMap[q.id] ?? [];
            const answered = answeredMap[q.id];
            const isRevealed = revealedQuestions.has(q.id);

            return (
              <Card key={q.id} className={`glass-card overflow-hidden transition-all ${answered ? (answered.isCorrect ? "border-[hsl(var(--chart-4))]/30" : "border-destructive/20") : ""}`}>
                <CardContent className="p-5 space-y-4">
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${answered
                        ? answered.isCorrect
                          ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]"
                          : "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                      }`}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed">{q.statement}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.difficulty && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                            {q.difficulty === "easy" ? "Fácil" : q.difficulty === "hard" ? "Difícil" : "Médio"}
                          </Badge>
                        )}
                        {answered && (
                          <Badge className={`text-[9px] py-0 px-1.5 border-0 ${answered.isCorrect ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" : "bg-destructive/10 text-destructive"}`}>
                            {answered.isCorrect ? "✓ Correta" : "✗ Incorreta"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pl-11">
                    {options.map(opt => {
                      let optClass = "p-3 rounded-lg border cursor-pointer transition-all text-sm";
                      if (isRevealed) {
                        if (opt.is_correct) {
                          optClass += " border-[hsl(var(--chart-4))]/50 bg-[hsl(var(--chart-4))]/5";
                        } else if (answered && opt.id === answered.optionId && !opt.is_correct) {
                          optClass += " border-destructive/50 bg-destructive/5";
                        } else {
                          optClass += " border-border opacity-50";
                        }
                      } else {
                        optClass += " border-border hover:border-primary/40 hover:bg-primary/5";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={optClass}
                          onClick={() => handleAnswer(q.id, opt.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-xs text-primary w-5">{opt.label})</span>
                            <span className="flex-1">{opt.text}</span>
                            {isRevealed && opt.is_correct && <CheckCircle className="w-4 h-4 text-[hsl(var(--chart-4))] shrink-0" />}
                            {isRevealed && answered && opt.id === answered.optionId && !opt.is_correct && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {isRevealed && q.explanation && (
                    <div className="ml-11 p-3 rounded-lg bg-primary/5 border border-primary/15">
                      <p className="text-xs font-semibold text-primary mb-1">Explicação:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
