import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, ChevronRight, X, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    generateSmartNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  };

  const generateSmartNotifications = async () => {
    if (!user) return;

    // Check review queue
    const { count: reviewCount } = await supabase
      .from("review_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString());

    if (reviewCount && reviewCount > 0) {
      // Only insert if no recent review notification exists
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "review_reminder")
        .gte("created_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: `🧠 ${reviewCount} revisões pendentes`,
          message: "Suas questões de revisão espaçada estão prontas. Revise agora para fixar o conteúdo!",
          type: "review_reminder",
          link: "/revisoes",
        });
      }
    }

    // Check streak
    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const lastDate = new Date(sessions[0].started_at).toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate === yesterday.toDateString()) {
        const { data: existingStreak } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "streak_reminder")
          .gte("created_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingStreak || existingStreak.length === 0) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: "🔥 Mantenha sua sequência!",
            message: "Você estudou ontem. Estude hoje para não perder o combo!",
            type: "streak_reminder",
            link: "/dashboard",
          });
        }
      }
    }

    // Refresh after generating
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcons: Record<string, string> = {
    review_reminder: "🧠",
    streak_reminder: "🔥",
    achievement: "🏆",
    admin: "📢",
    info: "ℹ️",
    alert: "⚠️",
    welcome: "👋",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse-soft">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <p className="font-heading font-semibold text-sm">Notificações</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary gap-1" onClick={markAllRead}>
              <Check className="w-3 h-3" /> Marcar todas lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sem notificações</p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`flex gap-3 p-3 transition-colors border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 ${!n.read ? "bg-primary/5" : ""}`}
                onClick={() => handleClick(n)}
              >
                <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="text-muted-foreground/40 hover:text-destructive shrink-0 self-start mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
