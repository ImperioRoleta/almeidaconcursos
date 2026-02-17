import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Send, Users, User, Megaphone, Loader2, Trash2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminNotificacoes() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("admin");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<"all" | "premium" | "free" | "single">("all");
  const [singleUserId, setSingleUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<{ user_id: string; name: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, name").order("name");
    setUsers(data ?? []);
  };

  const fetchHistory = async () => {
    // Get recent admin-sent notifications (grouped by title+message)
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, created_at, created_by")
      .not("created_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    
    // Deduplicate by title + created_at (same batch)
    const seen = new Set<string>();
    const unique = (data ?? []).filter(n => {
      const key = `${n.title}-${n.created_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setHistory(unique);
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim() || !user) {
      toast.error("Preencha título e mensagem.");
      return;
    }

    setSending(true);
    try {
      let targetUserIds: string[] = [];

      if (target === "single") {
        if (!singleUserId) {
          toast.error("Selecione um usuário.");
          setSending(false);
          return;
        }
        targetUserIds = [singleUserId];
      } else {
        // Get users based on filter
        const { data: subs } = await supabase.from("subscriptions").select("user_id, plan, status");
        const allSubs = subs ?? [];

        if (target === "all") {
          targetUserIds = allSubs.map(s => s.user_id);
        } else if (target === "premium") {
          targetUserIds = allSubs.filter(s => s.plan !== "gratuito" && s.status === "active").map(s => s.user_id);
        } else if (target === "free") {
          targetUserIds = allSubs.filter(s => s.plan === "gratuito").map(s => s.user_id);
        }
      }

      if (targetUserIds.length === 0) {
        toast.error("Nenhum usuário encontrado para esse filtro.");
        setSending(false);
        return;
      }

      // Batch insert
      const notifications = targetUserIds.map(uid => ({
        user_id: uid,
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || null,
        created_by: user.id,
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
      }

      toast.success(`Notificação enviada para ${targetUserIds.length} usuário(s)!`);
      setTitle("");
      setMessage("");
      setLink("");
      fetchHistory();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || "Tente novamente"));
    }
    setSending(false);
  };

  const targetLabels: Record<string, string> = {
    all: "Todos os usuários",
    premium: "Apenas Premium",
    free: "Apenas gratuitos",
    single: "Usuário específico",
  };

  const typeOptions = [
    { value: "admin", label: "📢 Comunicado" },
    { value: "alert", label: "⚠️ Alerta" },
    { value: "info", label: "ℹ️ Informação" },
    { value: "achievement", label: "🏆 Conquista" },
    { value: "welcome", label: "👋 Boas-vindas" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Notificações
        </h1>
      </div>

      {/* Send notification form */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Enviar Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Destinatários</label>
              <Select value={target} onValueChange={(v: any) => setTarget(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><span className="flex items-center gap-2"><Users className="w-3 h-3" /> Todos os usuários</span></SelectItem>
                  <SelectItem value="premium"><span className="flex items-center gap-2">👑 Apenas Premium</span></SelectItem>
                  <SelectItem value="free"><span className="flex items-center gap-2">🆓 Apenas gratuitos</span></SelectItem>
                  <SelectItem value="single"><span className="flex items-center gap-2"><User className="w-3 h-3" /> Usuário específico</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {target === "single" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Selecionar Usuário</label>
              <Select value={singleUserId} onValueChange={setSingleUserId}>
                <SelectTrigger><SelectValue placeholder="Escolha um usuário..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.name || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 🚀 Nova funcionalidade disponível!" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descreva a notificação..." rows={3} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Link (opcional)</label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Ex: /aulas ou /assinatura" />
          </div>

          <Button onClick={sendNotification} disabled={sending || !title.trim() || !message.trim()} className="gradient-primary text-primary-foreground w-full gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Enviando..." : `Enviar para ${targetLabels[target]}`}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" /> Histórico de Envios
            </CardTitle>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
        </CardHeader>
        {showHistory && (
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma notificação enviada ainda.</p>
            ) : (
              history.map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{n.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
