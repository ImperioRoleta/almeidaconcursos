import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Shield, Search, Ban, CheckCircle, Crown, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*, subscriptions(*), user_roles(*)");
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updatePlan = async (userId: string, plan: string) => {
    const { error } = await supabase.from("subscriptions").update({ plan }).eq("user_id", userId);
    if (error) { toast.error("Erro ao atualizar plano"); return; }
    toast.success("Plano atualizado");
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscriptions: [{ ...u.subscriptions?.[0], plan }] } : u));
  };

  const toggleBlock = async (userId: string, current: string) => {
    const newStatus = current === "blocked" ? "active" : "blocked";
    const { error } = await supabase.from("subscriptions").update({ status: newStatus }).eq("user_id", userId);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(newStatus === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado");
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscriptions: [{ ...u.subscriptions?.[0], status: newStatus }] } : u));
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q);
  });

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito",
    premium_mensal: "Premium Mensal",
    premium_anual: "Premium Anual",
  };

  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/10 text-primary border-primary/30",
    premium_anual: "bg-accent/10 text-accent border-accent/30",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <p className="text-muted-foreground text-sm">{users.length} usuários cadastrados</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions;
            const plan = sub?.plan || "gratuito";
            const status = sub?.status || "active";
            const isAdminUser = u.user_roles?.some((r: any) => r.role === "admin");

            return (
              <Card key={u.id} className={`glass-card transition-colors ${status === "blocked" ? "border-destructive/30 opacity-70" : "hover:border-primary/20"}`}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isAdminUser ? "bg-accent/10" : "bg-primary/10"}`}>
                      {isAdminUser ? <Shield className="w-5 h-5 text-accent" /> : <User className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold truncate">{u.name || "Sem nome"}</p>
                        {isAdminUser && <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">Admin</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.user_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`text-xs ${planColors[plan] || planColors.gratuito}`}>
                      <Crown className="w-3 h-3 mr-1" />
                      {planLabels[plan] || plan}
                    </Badge>

                    <Select value={plan} onValueChange={v => updatePlan(u.user_id, v)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gratuito">Gratuito</SelectItem>
                        <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                        <SelectItem value="premium_anual">Premium Anual</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant={status === "blocked" ? "default" : "destructive"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => toggleBlock(u.user_id, status)}
                    >
                      {status === "blocked" ? <><CheckCircle className="w-3.5 h-3.5" /> Desbloquear</> : <><Ban className="w-3.5 h-3.5" /> Bloquear</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>}
        </div>
      )}
    </div>
  );
}
