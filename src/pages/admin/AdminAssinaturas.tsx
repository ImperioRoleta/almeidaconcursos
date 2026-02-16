import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export default function AdminAssinaturas() {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("subscriptions").select("*, profiles(name)").then(({ data }) => setSubs(data ?? []));
  }, []);

  const updatePlan = async (id: string, plan: string) => {
    await supabase.from("subscriptions").update({ plan }).eq("id", id);
    setSubs(prev => prev.map(s => s.id === id ? { ...s, plan } : s));
    toast.success("Plano atualizado");
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("subscriptions").update({ status }).eq("id", id);
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    toast.success("Status atualizado");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6 text-gold" /> Assinaturas</h1>

      <div className="space-y-3">
        {subs.map(s => (
          <Card key={s.id} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-medium">{s.profiles?.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{s.user_id}</p>
              </div>
              <div className="flex gap-3">
                <Select value={s.plan} onValueChange={v => updatePlan(s.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuito">Gratuito</SelectItem>
                    <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                    <SelectItem value="premium_anual">Premium Anual</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={s.status} onValueChange={v => updateStatus(s.id, v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
