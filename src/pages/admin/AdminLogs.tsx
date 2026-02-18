/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, RefreshCw, Search, User, Shield, CreditCard, BookOpen, Clock, Filter } from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  login: { label: "Login", color: "bg-primary/10 text-primary", icon: User },
  signup: { label: "Cadastro", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]", icon: User },
  subscription_granted: { label: "Assinatura concedida", color: "bg-accent/10 text-accent", icon: CreditCard },
  subscription_expired: { label: "Assinatura expirada", color: "bg-destructive/10 text-destructive", icon: Clock },
  trial_granted: { label: "Teste concedido", color: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)]", icon: Shield },
  payment_approved: { label: "Pagamento aprovado", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]", icon: CreditCard },
  payment_rejected: { label: "Pagamento rejeitado", color: "bg-destructive/10 text-destructive", icon: CreditCard },
  user_blocked: { label: "Usuário bloqueado", color: "bg-destructive/10 text-destructive", icon: Shield },
  user_unblocked: { label: "Usuário desbloqueado", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]", icon: Shield },
  role_changed: { label: "Papel alterado", color: "bg-accent/10 text-accent", icon: Shield },
  lesson_completed: { label: "Aula concluída", color: "bg-primary/10 text-primary", icon: BookOpen },
  simulation_completed: { label: "Simulado concluído", color: "bg-primary/10 text-primary", icon: BookOpen },
  plan_generated: { label: "Plano gerado", color: "bg-accent/10 text-accent", icon: BookOpen },
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    const [logsRes, profilesRes] = await Promise.all([
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id, name"),
    ]);

    const map: Record<string, string> = {};
    profilesRes.data?.forEach(p => { map[p.user_id] = p.name; });
    setProfileMap(map);
    setLogs(logsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const userName = profileMap[log.user_id] || "";
    const matchesSearch = !q || userName.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.user_id.toLowerCase().includes(q);
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  const actionStats = uniqueActions.reduce<Record<string, number>>((acc, action) => {
    acc[action] = logs.filter(l => l.action === action).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" /> Logs de Atividade
          </h1>
          <p className="text-muted-foreground text-sm">{logs.length} registros • Últimas 200 atividades</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(actionStats).slice(0, 4).map(([action, count]) => {
          const meta = ACTION_LABELS[action];
          const Icon = meta?.icon || ScrollText;
          return (
            <Card key={action} className="glass-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{meta?.label || action}</p>
                  <p className="text-lg font-heading font-bold font-mono">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, ação ou ID..." className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg">Registros ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {filtered.map(log => {
                const meta = ACTION_LABELS[log.action];
                const Icon = meta?.icon || ScrollText;
                const userName = profileMap[log.user_id] || "Desconhecido";
                const details = log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : null;

                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/30 hover:border-border/60 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{userName}</span>
                        <Badge className={`text-[10px] ${meta?.color || "bg-muted text-muted-foreground"}`}>
                          {meta?.label || log.action}
                        </Badge>
                      </div>
                      {details && details !== "{}" && details !== "null" && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">{details}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum log encontrado</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
