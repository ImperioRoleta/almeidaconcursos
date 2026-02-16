import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CalendarDays, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "reminder" | "achievement" | "info";
  read: boolean;
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkPlanReminders();
  }, [user]);

  const checkPlanReminders = async () => {
    const { data: plans } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .limit(1);

    if (!plans || plans.length === 0) return;

    const plan = plans[0];
    const planData = typeof plan.plan_data === "string" ? JSON.parse(plan.plan_data) : plan.plan_data;
    const currentDay = planData[plan.current_day - 1];

    if (!currentDay) return;

    const pendingTasks = currentDay.tasks?.filter((t: any) => !t.done) ?? [];
    if (pendingTasks.length === 0) return;

    const notifs: Notification[] = [
      {
        id: "plan-reminder",
        title: `📚 Dia ${plan.current_day} — ${pendingTasks.length} tarefas pendentes`,
        message: `Foco: ${currentDay.focus}. Não perca o ritmo!`,
        type: "reminder",
        read: false,
      },
    ];

    // Check streak motivation
    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("started_at")
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const lastDate = new Date(sessions[0].started_at).toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate === yesterday.toDateString()) {
        notifs.push({
          id: "streak-keep",
          title: "🔥 Mantenha sua sequência!",
          message: "Você estudou ontem. Estude hoje para manter o combo!",
          type: "info",
          read: false,
        });
      }
    }

    setNotifications(notifs);
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse-soft">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="font-heading font-semibold text-sm">Notificações</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sem notificações</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="flex gap-3 p-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  {n.type === "reminder" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1.5 h-7 text-xs text-primary gap-1 p-0"
                      onClick={() => { setOpen(false); navigate("/plano"); }}
                    >
                      Ver plano <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
