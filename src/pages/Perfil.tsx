import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Award, Clock, Target, BookOpen, Shield, Save, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Perfil() {
  const { user, profile, isAdmin } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ hours: 0, accuracy: 0, lessons: 0, questions: 0 });
  const [subscription, setSubscription] = useState<any>(null);
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => {
    if (profile) setName(profile.name || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [sessionsRes, answersRes, progressRes, subRes, levelsRes] = await Promise.all([
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct").eq("user_id", user.id),
        supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase.from("levels").select("*").order("rank_order"),
      ]);

      const totalSeconds = sessionsRes.data?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) ?? 0;
      const answers = answersRes.data ?? [];
      const correct = answers.filter(a => a.is_correct).length;

      setStats({
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
        lessons: progressRes.data?.length ?? 0,
        questions: answers.length,
      });
      setSubscription(subRes.data);
      setLevels(levelsRes.data ?? []);
    };
    fetchData();
  }, [user]);

  const saveName = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    await supabase.from("profiles").update({ name: name.trim() }).eq("user_id", user.id);
    toast.success("Nome atualizado!");
    setSaving(false);
  };

  const levelName = profile?.levels?.name || "Recruta";
  const currentLevelOrder = profile?.levels?.rank_order || 1;
  const totalLevels = levels.length || 6;
  const levelProgress = Math.round((currentLevelOrder / totalLevels) * 100);

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito",
    premium_mensal: "Premium Mensal",
    premium_anual: "Premium Anual",
  };

  const statCards = [
    { label: "Horas Estudadas", value: `${stats.hours}h`, icon: Clock, color: "text-primary" },
    { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, color: "text-gold" },
    { label: "Aulas Concluídas", value: stats.lessons, icon: BookOpen, color: "text-highlight" },
    { label: "Questões", value: stats.questions, icon: BarChart3, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="font-heading text-2xl font-bold">Meu Perfil</h1>

      {/* Profile Card */}
      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-highlight flex items-center justify-center">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-xl">{profile?.name || "Aluno"}</h2>
                {isAdmin && <Shield className="w-4 h-4 text-gold" />}
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Award className="w-4 h-4 text-gold" />
                <span className="text-gold font-heading font-semibold text-sm">{levelName}</span>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso de Patente</span>
              <span>{currentLevelOrder}/{totalLevels}</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>

          {/* Edit Name */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <Button onClick={saveName} disabled={saving} className="mt-auto gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plano</span>
            <span className="font-heading font-semibold text-gold">
              {planLabels[subscription?.plan] || "Gratuito"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={`text-sm font-medium ${subscription?.status === "active" ? "text-green-400" : "text-red-400"}`}>
              {subscription?.status === "active" ? "Ativo" : subscription?.status === "blocked" ? "Bloqueado" : "Inativo"}
            </span>
          </div>
          {subscription?.expire_date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expira em</span>
              <span className="text-sm">{new Date(subscription.expire_date).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((c, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-heading font-bold font-mono">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
