import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Crown, Search, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminAssinaturas() {
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editSub, setEditSub] = useState<any>(null);
  const [expireDate, setExpireDate] = useState("");

  const fetchSubs = () => {
    supabase.from("subscriptions").select("*, profiles(name, user_id)").then(({ data }) => setSubs(data ?? []));
  };

  useEffect(() => { fetchSubs(); }, []);

  const updateSub = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("subscriptions").update(updates).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setSubs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    toast.success("Assinatura atualizada!");
  };

  const openEdit = (sub: any) => {
    setEditSub(sub);
    setExpireDate(sub.expire_date ? sub.expire_date.split("T")[0] : "");
  };

  const saveEdit = async () => {
    if (!editSub) return;
    await updateSub(editSub.id, {
      expire_date: expireDate ? new Date(expireDate).toISOString() : null,
    });
    setEditSub(null);
  };

  const filtered = subs.filter(s => {
    const name = s.profiles?.name?.toLowerCase() || "";
    const userId = s.user_id?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || userId.includes(search.toLowerCase());
  });

  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/20 text-primary",
    premium_anual: "bg-gold/20 text-gold",
  };

  const statusColors: Record<string, string> = {
    active: "text-green-400",
    inactive: "text-muted-foreground",
    blocked: "text-red-400",
  };

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito",
    premium_mensal: "Premium Mensal",
    premium_anual: "Premium Anual",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-gold" /> Gestão de Assinaturas
          </h1>
          <p className="text-muted-foreground text-sm">{subs.length} assinaturas cadastradas</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou ID..." className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(s => (
          <Card key={s.id} className="glass-card hover:border-primary/20 transition-colors">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{s.profiles?.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.user_id?.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={planColors[s.plan] || ""}>{planLabels[s.plan] || s.plan}</Badge>
                <span className={`text-sm font-medium ${statusColors[s.status] || ""}`}>
                  {s.status === "active" ? "● Ativo" : s.status === "blocked" ? "● Bloqueado" : "● Inativo"}
                </span>

                <Select value={s.plan} onValueChange={v => updateSub(s.id, { plan: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuito">Gratuito</SelectItem>
                    <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                    <SelectItem value="premium_anual">Premium Anual</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={s.status} onValueChange={v => updateSub(s.id, { status: v })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                  <Calendar className="w-4 h-4 mr-1" /> Validade
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhuma assinatura encontrada.</p>}
      </div>

      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">Definir Validade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Usuário: {editSub?.profiles?.name}</p>
            <div>
              <Label>Data de Expiração</Label>
              <Input type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} />
            </div>
            <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
