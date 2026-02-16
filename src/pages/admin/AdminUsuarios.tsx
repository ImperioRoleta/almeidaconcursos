import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Shield } from "lucide-react";

export default function AdminUsuarios() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("*, subscriptions(*), user_roles(*)").then(({ data }) => setUsers(data ?? []));
  }, []);

  const updatePlan = async (userId: string, plan: string) => {
    await supabase.from("subscriptions").update({ plan }).eq("user_id", userId);
    toast.success("Plano atualizado");
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscriptions: [{ ...u.subscriptions?.[0], plan }] } : u));
  };

  const toggleBlock = async (userId: string, current: string) => {
    const newStatus = current === "blocked" ? "active" : "blocked";
    await supabase.from("subscriptions").update({ status: newStatus }).eq("user_id", userId);
    toast.success(newStatus === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado");
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscriptions: [{ ...u.subscriptions?.[0], status: newStatus }] } : u));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Gestão de Usuários</h1>
      <div className="space-y-3">
        {users.map(u => {
          const sub = u.subscriptions?.[0] || u.subscriptions;
          const plan = sub?.plan || "gratuito";
          const status = sub?.status || "active";
          const isAdminUser = u.user_roles?.some((r: any) => r.role === "admin");
          return (
            <Card key={u.id} className="glass-card">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {isAdminUser && <Shield className="w-4 h-4 text-gold" />}
                  <div>
                    <p className="font-medium">{u.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{u.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={plan} onValueChange={v => updatePlan(u.user_id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gratuito">Gratuito</SelectItem>
                      <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                      <SelectItem value="premium_anual">Premium Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant={status === "blocked" ? "default" : "destructive"} size="sm" onClick={() => toggleBlock(u.user_id, status)}>
                    {status === "blocked" ? "Desbloquear" : "Bloquear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
