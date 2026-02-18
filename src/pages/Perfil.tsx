/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserXP } from "@/hooks/useUserXP";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User, Award, Clock, Target, BookOpen, Shield, Save,
  BarChart3, Flame, Trophy, Star, Crosshair, ChevronUp, Swords,
  Camera, RotateCcw, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Perfil() {
  const { user, profile, isAdmin } = useAuth();
  const { isPremium, isTrial, isActive, planLabel, daysLeft } = useSubscription();
  const { xp } = useUserXP(user?.id);
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ hours: 0, accuracy: 0, lessons: 0, questions: 0, streak: 0, simulations: 0 });
  const [subscription, setSubscription] = useState<any>(null);
  const [levels, setLevels] = useState<any[]>([]);
  const [achievements, setAchievements] = useState({ total: 0, unlocked: 0, xp: 0 });
  const [diagnosticScore, setDiagnosticScore] = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [sessionsRes, answersRes, progressRes, subRes, levelsRes, achRes, uaRes, diagRes, simRes, profileRes] = await Promise.all([
        supabase.from("study_sessions").select("duration_seconds, started_at").eq("user_id", user.id),
        supabase.from("user_answers").select("is_correct, answered_at").eq("user_id", user.id),
        supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase.from("levels").select("*").order("rank_order"),
        supabase.from("achievements").select("id, xp_reward"),
        supabase.from("user_achievements").select("achievement_id, achievements(xp_reward)").eq("user_id", user.id),
        supabase.from("diagnostic_results").select("score").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1),
        supabase.from("simulation_results").select("id").eq("user_id", user.id),
        supabase.from("profiles").select("last_reset_at").eq("user_id", user.id).single(),
      ]);

      const sessions = sessionsRes.data ?? [];
      const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const answers = answersRes.data ?? [];
      const correct = answers.filter(a => a.is_correct).length;

      const allDays = new Set([
        ...sessions.map(s => new Date(s.started_at).toDateString()),
        ...answers.map(a => new Date(a.answered_at).toDateString()),
      ]);
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (allDays.has(d.toDateString())) streak++;
        else break;
      }

      setStats({
        hours: Math.round((totalSeconds / 3600) * 10) / 10,
        accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
        lessons: progressRes.data?.length ?? 0,
        questions: answers.length,
        streak,
        simulations: simRes.data?.length ?? 0,
      });
      setSubscription(subRes.data);
      setLevels(levelsRes.data ?? []);
      setLastResetAt((profileRes.data as any)?.last_reset_at || null);

      const unlockedAchs = uaRes.data ?? [];
      const totalXp = unlockedAchs.reduce((s: number, a: any) => s + ((a as any).achievements?.xp_reward || 0), 0);
      setAchievements({ total: achRes.data?.length ?? 0, unlocked: unlockedAchs.length, xp: totalXp });

      if (diagRes.data && diagRes.data.length > 0) {
        setDiagnosticScore(diagRes.data[0].score);
      }
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 2MB)"); return; }

    setUploading(true);
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erro no upload: " + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    toast.success("Foto atualizada!");
    setUploading(false);
  };

  const canReset = isActive && (isPremium || isTrial) && (!lastResetAt || new Date(lastResetAt) < new Date(Date.now() - 30 * 86400000));
  const daysUntilReset = lastResetAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(lastResetAt).getTime()) / 86400000)) : 0;

  const handleSelfReset = async () => {
    if (!user) return;
    setResetting(true);
    const { data, error } = await supabase.rpc("user_self_reset");
    setResetting(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result?.success) {
      toast.success("Progresso resetado! Recomeçando do zero.");
      setShowResetDialog(false);
      window.location.reload();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  const levelName = profile?.levels?.name || "Recruta";
  const currentLevelOrder = profile?.levels?.rank_order || 1;
  const totalLevels = levels.length || 6;
  const nextLevel = levels.find(l => l.rank_order === currentLevelOrder + 1);
  const levelProgress = Math.round((currentLevelOrder / totalLevels) * 100);

  const readiness = Math.min(100, Math.round(
    (Math.min(stats.accuracy, 100) * 0.4) +
    (Math.min(stats.hours / 50, 1) * 100 * 0.3) +
    (Math.min(stats.streak / 30, 1) * 100 * 0.3)
  ));
  const readinessLabel = readiness >= 80 ? "Pronto para Combate" : readiness >= 60 ? "Em Preparação" : readiness >= 30 ? "Em Treinamento" : "Iniciante";
  const readinessColor = readiness >= 80 ? "text-green-400" : readiness >= 60 ? "text-accent" : readiness >= 30 ? "text-primary" : "text-muted-foreground";

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Profile Header with Avatar */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full -ml-12 -mb-12" />

        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <Badge variant="outline" className="text-[10px] tracking-widest uppercase border-primary/30 text-primary">
              <Shield className="w-3 h-3 mr-1" /> Ficha do Aluno
            </Badge>
            {isAdmin && (
              <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                <Star className="w-3 h-3 mr-1" /> Administrador
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-5">
            {/* Avatar with camera overlay */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-24 h-24 rounded-2xl shadow-lg shadow-primary/20 border-2 border-primary/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-md">
                <Swords className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="font-heading text-2xl font-bold truncate">{profile?.name || "Aluno"}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge className="bg-accent/10 text-accent border-accent/20">
                  <Award className="w-3 h-3 mr-1" /> {levelName}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{planLabel}</Badge>
                {daysLeft !== null && daysLeft > 0 && (
                  <span className="text-[10px] text-muted-foreground">{daysLeft}d restantes</span>
                )}
              </div>
            </div>
          </div>

          {/* Promotion progress */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <ChevronUp className="w-4 h-4 text-primary" /> Progresso para Promoção
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {levelName} → {nextLevel?.name || "Patente Máxima"}
              </span>
            </div>
            <Progress value={levelProgress} className="h-3" />
            {nextLevel && (
              <p className="text-[10px] text-muted-foreground">
                Requisitos: {nextLevel.min_hours}h de estudo • {nextLevel.min_accuracy}% de acerto • {(nextLevel as any).min_xp || 0} XP
              </p>
            )}
            <p className="text-[10px] text-primary font-semibold mt-1">Seu XP total: {xp.total} XP</p>
          </div>
        </div>
      </div>

      {/* Readiness Index */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-sm">Índice de Prontidão</h3>
            </div>
            <span className={`font-heading font-bold text-2xl font-mono ${readinessColor}`}>{readiness}%</span>
          </div>
          <Progress value={readiness} className="h-2 mb-2" />
          <p className={`text-xs font-medium ${readinessColor}`}>{readinessLabel}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acerto</p>
              <p className="font-mono font-bold text-sm">{stats.accuracy}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Horas</p>
              <p className="font-mono font-bold text-sm">{stats.hours}h</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sequência</p>
              <p className="font-mono font-bold text-sm">{stats.streak}🔥</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Horas de Treinamento", value: `${stats.hours}h`, icon: Clock, color: "text-primary" },
          { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, color: "text-accent" },
          { label: "Aulas Concluídas", value: stats.lessons, icon: BookOpen, color: "text-[hsl(210,80%,55%)]" },
          { label: "Questões Resolvidas", value: stats.questions, icon: BarChart3, color: "text-green-400" },
          { label: "Simulados", value: stats.simulations, icon: Trophy, color: "text-[hsl(280,70%,55%)]" },
          { label: "Conquistas", value: `${achievements.unlocked}/${achievements.total}`, icon: Award, color: "text-accent" },
          { label: "XP Total", value: xp.total, icon: Star, color: "text-primary" },
          { label: "Dias Seguidos", value: `${stats.streak}🔥`, icon: Flame, color: "text-[hsl(25,95%,53%)]" },
        ].map((c, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{c.label}</p>
              </div>
              <p className="text-xl font-heading font-bold font-mono">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diagnostic Score */}
      {diagnosticScore !== null && (
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-primary" />
              <div>
                <p className="font-heading font-semibold text-sm">Diagnóstico Inicial</p>
                <p className="text-xs text-muted-foreground">Resultado do seu teste de nível</p>
              </div>
            </div>
            <span className="font-heading font-bold text-2xl font-mono text-primary">{Math.round(diagnosticScore)}%</span>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/conquistas">
          <Card className="glass-card hover:border-accent/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-heading font-semibold text-sm">Ver Conquistas</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/ranking">
          <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="font-heading font-semibold text-sm">Ver Ranking</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Edit Name & Subscription */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-muted-foreground uppercase tracking-wider">Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <Button onClick={saveName} disabled={saving} className="mt-auto gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-semibold text-accent">{planLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`font-semibold ${subscription?.status === "active" ? "text-green-400" : "text-red-400"}`}>
                {subscription?.status === "active" ? "Ativo" : "Inativo"}
              </p>
            </div>
          </div>
          {subscription?.expire_date && (
            <p className="text-xs text-muted-foreground">
              Expira em: {new Date(subscription.expire_date).toLocaleDateString("pt-BR")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Self Reset (Premium only) */}
      {isActive && (isPremium || isTrial) && (
        <Card className="glass-card border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-heading font-semibold text-sm">Recomeçar do Zero</p>
                  <p className="text-xs text-muted-foreground">
                    {canReset
                      ? "Apague todo seu progresso e recomece. Disponível 1x por mês."
                      : `Disponível novamente em ${daysUntilReset} dia(s).`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!canReset}
                className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                onClick={() => setShowResetDialog(true)}
              >
                Resetar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Recomeçar do Zero
            </DialogTitle>
            <DialogDescription>
              Isso vai apagar <span className="font-semibold text-foreground">TODOS</span> os seus dados de progresso — questões, aulas, conquistas, simulados, redações, diagnóstico e sessões de estudo. Seu nome, email e assinatura serão preservados. Esta ação é irreversível!
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
            <Button onClick={handleSelfReset} disabled={resetting} className="bg-orange-500 text-white hover:bg-orange-600">
              {resetting ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
