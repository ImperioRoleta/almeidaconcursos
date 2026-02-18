/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, HelpCircle, Brain, FileText } from "lucide-react";

type LastActivity = {
  label: string;
  url: string;
  icon: React.ElementType;
};

interface ContinueButtonProps {
  className?: string;
}

export default function ContinueButton({ className }: ContinueButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState<LastActivity | null>(null);

  useEffect(() => {
    if (!user) return;
    const detect = async () => {

      // Check last study session subject
      const { data: lastSession } = await supabase
        .from("study_sessions")
        .select("subject_id, subjects(name)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (lastSession?.subject_id) {
        const subName = (lastSession as any).subjects?.name || "Matéria";
        setActivity({ label: `Continuar ${subName}`, url: "/questoes", icon: HelpCircle });
        return;
      }

      // Check if user has incomplete study trail
      const { data: trail } = await supabase
        .from("study_trail")
        .select("current_step, subjects(name)")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .limit(1)
        .single();

      if (trail) {
        const stepMap: Record<string, { label: string; url: string; icon: React.ElementType }> = {
          lesson: { label: "Continuar aula", url: "/aulas", icon: BookOpen },
          questions: { label: "Resolver questões", url: "/questoes", icon: HelpCircle },
          review: { label: "Fazer revisão", url: "/revisoes", icon: Brain },
          simulation: { label: "Simulado", url: "/simulados", icon: FileText },
        };
        const step = stepMap[trail.current_step] || stepMap.lesson;
        setActivity({ ...step, label: `${step.label} — ${(trail as any).subjects?.name || ""}` });
        return;
      }

      // Default: go to lessons
      setActivity({ label: "Começar a estudar", url: "/aulas", icon: BookOpen });
    };
    detect();
  }, [user]);

  // Hide on certain pages or if no activity
  if (!activity) return null;
  if (["/aulas", "/questoes", "/revisoes", "/simulados", "/ia"].includes(location.pathname)) return null;

  return (
    <div className={className}>
      <Button
        onClick={() => navigate(activity.url)}
        className="gradient-primary text-primary-foreground shadow-lg glow-primary rounded-full px-5 h-12 gap-2 text-sm font-heading font-semibold w-full md:w-auto"
      >
        <Play className="w-4 h-4" />
        {activity.label}
      </Button>
    </div>
  );
}
