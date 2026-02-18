/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  BookOpen, Target, Brain, Zap, ChevronRight,
  CheckCircle, Circle, Lock, Loader2
} from "lucide-react";

type TrailStep = "lesson" | "questions" | "review" | "simulation" | "completed";

type TrailData = {
  id: string;
  subject_id: string;
  subject_name: string;
  current_step: TrailStep;
  lessons_done: number;
  questions_done: number;
  review_done: boolean;
  simulation_done: boolean;
  total_lessons: number;
  total_questions: number;
};

const STEPS: { key: TrailStep; label: string; icon: any; color: string }[] = [
  { key: "lesson", label: "Aulas", icon: BookOpen, color: "text-primary" },
  { key: "questions", label: "Questões", icon: Target, color: "text-accent" },
  { key: "review", label: "Revisão", icon: Brain, color: "text-[hsl(280,70%,55%)]" },
  { key: "simulation", label: "Simulado", icon: Zap, color: "text-green-400" },
];

export default function StudyTrail() {
  const { user } = useAuth();
  const [trails, setTrails] = useState<TrailData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrails = useCallback(async () => {
    const [subjectsRes, trailsRes, lessonsRes, questionsRes] = await Promise.all([
      supabase.from("subjects").select("id, name").order("order_index"),
      supabase.from("study_trail").select("*").eq("user_id", user!.id),
      supabase.from("lessons").select("id, topic_id, topics!inner(subject_id)"),
      supabase.from("questions").select("id, subject_id"),
    ]);

    const subjects = subjectsRes.data ?? [];
    const existingTrails = trailsRes.data ?? [];
    const lessons = lessonsRes.data ?? [];
    const questions = questionsRes.data ?? [];

    const trailMap = new Map(existingTrails.map(t => [t.subject_id, t]));

    const enriched: TrailData[] = subjects.map(s => {
      const trail = trailMap.get(s.id);
      const subLessons = lessons.filter((l: any) => l.topics?.subject_id === s.id);
      const subQuestions = questions.filter(q => q.subject_id === s.id);

      return {
        id: trail?.id ?? "",
        subject_id: s.id,
        subject_name: s.name,
        current_step: (trail?.current_step as TrailStep) ?? "lesson",
        lessons_done: trail?.lessons_done ?? 0,
        questions_done: trail?.questions_done ?? 0,
        review_done: trail?.review_done ?? false,
        simulation_done: trail?.simulation_done ?? false,
        total_lessons: subLessons.length,
        total_questions: Math.min(subQuestions.length, 20),
      };
    });

    setTrails(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTrails();
  }, [user, fetchTrails]);

  const getStepIndex = (step: TrailStep) => {
    if (step === "completed") return 4;
    return STEPS.findIndex(s => s.key === step);
  };

  const getStepUrl = (trail: TrailData): string => {
    switch (trail.current_step) {
      case "lesson": return "/aulas";
      case "questions": return "/questoes";
      case "review": return "/revisoes";
      case "simulation": return "/simulados";
      default: return "/dashboard";
    }
  };

  const getProgress = (trail: TrailData): number => {
    const stepIdx = getStepIndex(trail.current_step);
    if (trail.current_step === "completed") return 100;
    const base = (stepIdx / 4) * 100;
    let stepProgress = 0;
    if (trail.current_step === "lesson" && trail.total_lessons > 0) {
      stepProgress = (trail.lessons_done / trail.total_lessons) * 25;
    } else if (trail.current_step === "questions" && trail.total_questions > 0) {
      stepProgress = (trail.questions_done / trail.total_questions) * 25;
    }
    return Math.min(100, Math.round(base + stepProgress));
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (trails.length === 0) return null;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          Trilha de Estudos
        </CardTitle>
        <p className="text-xs text-muted-foreground">Aula → Questões → Revisão → Simulado</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {trails.slice(0, 5).map(trail => {
          const progress = getProgress(trail);
          const currentStepIdx = getStepIndex(trail.current_step);
          const isCompleted = trail.current_step === "completed";

          return (
            <div key={trail.subject_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{trail.subject_name}</p>
                {isCompleted ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                    Concluído
                  </Badge>
                ) : (
                  <Link to={getStepUrl(trail)}>
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-primary">
                      Continuar <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => {
                  const done = i < currentStepIdx || isCompleted;
                  const active = i === currentStepIdx && !isCompleted;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                        ${done ? "bg-green-500/10 text-green-400" : active ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground/50"}
                      `}>
                        {done ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <StepIcon className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">{step.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-px flex-1 mx-0.5 ${done ? "bg-green-500/30" : "bg-muted/20"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <Progress value={progress} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
