/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserXP, calculateUserXP } from "@/hooks/useUserXP";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Award, Clock, Target, BookOpen, Shield, Pencil, Check, X,
  BarChart3, Flame, Trophy, Star, Crosshair, ChevronUp, Swords,
  Camera, RotateCcw, AlertTriangle, Mail, Calendar, Crown, Zap,
  TrendingUp, Sparkles, Medal, ArrowUpRight, Hexagon, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { SharePerformance } from "@/components/SharePerformance";

export default function Perfil() {
  const { user, profile, isAdmin } = useAuth();
  const { isPremium, isTrial, isActive, planLabel, daysLeft } = useSubscription();
  const { xp, loading: xpLoading } = useUserXP(user?.id);
  const [name, setName] = useState(profile?.name || "");
  const [editingName, setEditingName] = useState(false);
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
  const [lastNameChangeAt, setLastNameChangeAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessionsRes, answersRes, progressRes, subRes, levelsRes, achRes, uaRes, diagRes, simRes, profileRes] = await Promise.all([
          supabase.from("study_sessions").select("duration_seconds, started_at").eq("user_id", user.id),
          supabase.from("user_answers").select("is_correct, answered_at").eq("user_id", user.id),
          supabase.from("user_progress").select("id").eq("user_id", user.id).eq("completed", true),
          supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("levels").select("*").order("rank_order"),
          supabase.from("achievements").select("id, xp_reward"),
          supabase.from("user_achievements").select("achievement_id, achievements(xp_reward)").eq("user_id", user.id),
          supabase.from("diagnostic_results").select("score").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1),
          supabase.from("simulation_results").select("id").eq("user_id", user.id),
          supabase.from("profiles").select("last_reset_at, last_name_change_at").eq("user_id", user.id).single(),
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
        setLastNameChangeAt((profileRes.data as any)?.last_name_change_at || null);

        const unlockedAchs = uaRes.data ?? [];
        const totalXp = unlockedAchs.reduce((s: number, a: any) => s + ((a as any).achievements?.xp_reward || 0), 0);
        setAchievements({ total: achRes.data?.length ?? 0, unlocked: unlockedAchs.length, xp: totalXp });

        if (diagRes.data && diagRes.data.length > 0) {
          setDiagnosticScore(diagRes.data[0].score);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user || !profile || levels.length === 0) return;

    const checkPromotion = async () => {
      const totalXP = xp.total;
      const currentOrder = profile.levels?.rank_order || 1;

      let bestLevel = currentOrder;
      for (const lv of levels) {
        if (
          lv.rank_order > currentOrder &&
          stats.hours >= (lv.min_hours || 0) &&
          stats.accuracy >= (lv.min_accuracy || 0) &&
          totalXP >= (lv.min_xp || 0)
        ) {
          bestLevel = Math.max(bestLevel, lv.rank_order);
        }
      }

      if (bestLevel > currentOrder) {
        const newLevel = levels.find(l => l.rank_order === bestLevel);
        if (newLevel) {
          const { error } = await supabase.from("profiles").update({ level_id: newLevel.id }).eq("user_id", user.id);
          if (!error) {
            toast.success(`🎖️ EXCELENTE! Você foi promovido a ${newLevel.name}!`, {
              duration: 6000,
              description: "Sua nova patente já está ativa em todo o sistema."
            });
            // Update local profile state if possible or let the context refresh
            window.location.reload();
          }
        }
      }
    };
    if (!loading && !xpLoading) checkPromotion();
  }, [user, profile, levels, xp, stats, loading, xpLoading]);

  const canChangeName = !lastNameChangeAt || new Date(lastNameChangeAt) < new Date(Date.now() - 30 * 86400000);
  const daysUntilNameChange = lastNameChangeAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(lastNameChangeAt).getTime()) / 86400000)) : 0;

  // Reset Logic
  const canReset = isPremium && (!lastResetAt || new Date(lastResetAt) < new Date(Date.now() - 30 * 86400000));

  const handleSelfReset = async () => {
    if (!user) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.rpc('user_self_reset');

      if (error) throw error;

      if (data && !(data as any).success) {
        toast.error((data as any).error || "Erro ao resetar");
        return;
      }

      toast.success("Conta resetada com sucesso! Recarregando...");
      setShowResetDialog(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error("Erro ao resetar: " + (error.message || "Erro desconhecido"));
    } finally {
      setResetting(false);
    }
  };

  const saveName = async () => {
    if (!user || !name.trim()) return;
    if (!canChangeName) {
      toast.error(`Você só pode alterar o nome a cada 30 dias. Aguarde ${daysUntilNameChange} dia(s).`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), last_name_change_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar nome");
      setSaving(false);
      return;
    }
    setLastNameChangeAt(new Date().toISOString());
    toast.success("Nome atualizado!");
    setEditingName(false);
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

  const currentLevel = profile?.levels || levels[0];
  const nextLevel = levels.find(l => l.rank_order === (currentLevel?.rank_order || 0) + 1);

  // Calculate Progress based on XP
  let xpProgress = 0;
  if (currentLevel && nextLevel) {
    const totalNeeded = nextLevel.min_xp - currentLevel.min_xp;
    const currentGained = xp.total - currentLevel.min_xp;
    xpProgress = Math.min(100, Math.max(0, Math.round((currentGained / totalNeeded) * 100)));
  } else if (currentLevel && !nextLevel) {
    xpProgress = 100;
  }

  const readiness = Math.min(100, Math.round(
    (Math.min(stats.accuracy, 100) * 0.4) +
    (Math.min(stats.hours / 50, 1) * 100 * 0.3) +
    (Math.min(stats.streak / 30, 1) * 100 * 0.3)
  ));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <motion.div
      className="space-y-8 animate-fade-in pb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ══════ SURREAL HEADER ══════ */}
      <motion.div variants={item} className="relative group p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-border to-accent/20 overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full -top-20 -left-20 animate-pulse" />
        <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full -bottom-20 -right-20 animate-pulse" />

        <div className="relative glass-card border-none rounded-[2.4rem] p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
          {/* Avatar Section */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse scale-150" />
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] shadow-2xl border-4 border-white/10 ring-4 ring-primary/20 transition-transform group-hover:scale-105 duration-500">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-[2.5rem] bg-gradient-to-br from-primary via-blue-600 to-accent text-white">
                  <User className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-[2.5rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                <Camera className="w-8 h-8 text-white animate-bounce-subtle" />
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-[2.5rem] bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -bottom-2 -right-2 bg-accent shadow-xl border-4 border-card rounded-2xl p-2 z-20"
              >
                <Medal className="w-6 h-6 text-accent-foreground" />
              </motion.div>
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <AnimatePresence mode="wait">
                  {editingName ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                      <Input
                        ref={nameInputRef} value={name} onChange={e => setName(e.target.value)}
                        className="bg-muted/50 border-primary/20 text-xl font-bold h-12 w-64"
                        onKeyDown={e => e.key === "Enter" && saveName()}
                      />
                      <Button onClick={saveName} disabled={saving} className="h-12 w-12 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20">
                        {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Check className="w-5 h-5" />}
                      </Button>
                      <Button onClick={() => setEditingName(false)} variant="ghost" className="h-12 w-12 rounded-xl text-muted-foreground">
                        <X className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                      <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-foreground to-accent">
                        {profile?.name || "Aluno"}
                      </h1>
                      <button onClick={() => setEditingName(true)} className="p-2 rounded-xl hover:bg-primary/10 text-primary/60 hover:text-primary transition-all">
                        <Pencil className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-muted-foreground font-mono flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" /> {user?.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                <Shield className="w-4 h-4 mr-2" /> {currentLevel?.name || "Recruta"}
              </Badge>
              {isActive && (
                <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                  <Crown className="w-4 h-4 mr-2" /> {planLabel}
                </Badge>
              )}
              <Badge variant="outline" className="border-border/50 bg-background/50 px-4 py-1.5 rounded-xl text-xs font-mono">
                <Calendar className="w-4 h-4 mr-2" /> Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR", { year: 'numeric', month: 'short' }) : "---"}
              </Badge>
            </div>

            <div className="pt-2">
              <SharePerformance user={user} profile={profile} stats={stats} level={currentLevel} xp={xp} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════ PROMOTION & MISSIONS ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Surreal Promotion Card */}
        <motion.div variants={item} className="lg:col-span-2 relative group rounded-[2rem] overflow-hidden bg-card/10 backdrop-blur-xl border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-heading font-black flex items-center gap-3">
                  <TrendingUp className="text-primary animate-pulse" /> Status da Promoção
                </h3>
                <p className="text-muted-foreground text-sm">Seu progresso para a próxima patente militar</p>
              </div>
              <div className="text-right">
                <span className="block text-4xl font-black font-mono text-primary">{xp.total}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">XP Acumulado</span>
              </div>
            </div>

            {/* The XP Tube */}
            <div className="space-y-6">
              <div className="relative">
                <div className="flex justify-between text-xs font-black uppercase tracking-tighter mb-4">
                  <div className="flex items-center gap-2 group/rank cursor-help">
                    <Hexagon className="w-5 h-5 text-primary fill-primary/20" />
                    <span className="text-foreground">{currentLevel?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right group/rank cursor-help">
                    <span className="text-primary">{nextLevel?.name || "Patente Final"}</span>
                    <Hexagon className="w-5 h-5 text-accent fill-accent/20" />
                  </div>
                </div>

                <div className="relative h-6 rounded-3xl bg-muted/40 overflow-hidden border border-white/5 p-1">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full rounded-2xl bg-gradient-to-r from-primary via-blue-500 to-accent relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:40px_40px] animate-shimmer" />
                    {xpProgress > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                    )}
                  </motion.div>
                </div>

                <div className="flex justify-between mt-3 px-1 text-[10px] font-mono text-muted-foreground">
                  <span>{currentLevel?.min_xp || 0} XP</span>
                  <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{xpProgress}% CONCLUÍDO</span>
                  <span>{nextLevel?.min_xp || "MAX"} XP</span>
                </div>
              </div>

              {/* Requirements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center gap-1 group/item hover:bg-primary/5 transition-all">
                  <Zap className={`w-6 h-6 ${xp.total >= (nextLevel?.min_xp || 0) ? 'text-green-400' : 'text-primary'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">XP Necessário</p>
                  <p className="text-lg font-black font-mono">{(nextLevel?.min_xp || 0) - xp.total} remanescente</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center gap-1 group/item hover:bg-accent/5 transition-all">
                  <Target className={`w-6 h-6 ${stats.accuracy >= (nextLevel?.min_accuracy || 0) ? 'text-green-400' : 'text-accent'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">Acurácia Mínima</p>
                  <p className="text-lg font-black font-mono">{nextLevel?.min_accuracy || 0}% de acertos</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center gap-1 group/item hover:bg-blue-400/5 transition-all">
                  <Clock className={`w-6 h-6 ${stats.hours >= (nextLevel?.min_hours || 0) ? 'text-green-400' : 'text-blue-400'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1">Tempo de Fogo</p>
                  <p className="text-lg font-black font-mono">{nextLevel?.min_hours || 0}h de estudo</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Diagnostic/Readiness Card */}
        <motion.div variants={item} className="relative group rounded-[2rem] overflow-hidden bg-card/10 backdrop-blur-xl border border-white/5 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative w-32 h-32 mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
              <motion.circle
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                strokeDasharray={364.4} initial={{ strokeDashoffset: 364.4 }} animate={{ strokeDashoffset: 364.4 - (364.4 * readiness) / 100 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className={`${readiness >= 80 ? 'text-green-400' : readiness >= 50 ? 'text-primary' : 'text-accent'}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono">{readiness}%</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Prontidão</span>
            </div>
          </div>
          <h4 className="text-xl font-heading font-black mb-2 tracking-tight">Índice de Combate</h4>
          <p className="text-sm text-muted-foreground mb-6">Sua prontidão calculada com base em desempenho, constância e horas acumuladas.</p>
          <Link to="/diagnostico" className="w-full">
            <Button variant="outline" className="w-full rounded-2xl border-primary/20 hover:bg-primary/5 text-primary gap-2">
              <Sparkles className="w-4 h-4" /> Refazer Diagnóstico
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* ══════ STATS GRID ══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tempo Total", value: `${stats.hours}h`, icon: Clock, color: "text-blue-400", bg: "bg-blue-400/5" },
          { label: "Acertos", value: `${stats.accuracy}%`, icon: Target, color: "text-accent", bg: "bg-accent/5" },
          { label: "Aulas", value: stats.lessons, icon: BookOpen, color: "text-primary", bg: "bg-primary/5" },
          { label: "XP Bruto", value: xp.total, icon: Star, color: "text-yellow-400", bg: "bg-yellow-400/5" },
        ].map((s, i) => (
          <motion.div key={i} variants={item}>
            <Card className={`glass-card border-none hover:scale-105 transition-transform duration-300 ${s.bg}`}>
              <CardContent className="p-6">
                <s.icon className={`w-8 h-8 mb-3 ${s.color}`} />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{s.label}</p>
                <p className="text-2xl font-black font-mono mt-1">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ══════ UTILITIES ══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item} className="md:col-span-1">
          <Card className="glass-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Crown className="w-4 h-4" /> Gestão de Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground">Plano Atual</p>
                  <p className="font-black text-accent">{planLabel}</p>
                </div>
                <Badge className={isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                  {isActive ? 'Ativa' : 'Expirada'}
                </Badge>
              </div>
              {!isPremium && (
                <Link to="/assinatura">
                  <Button className="w-full h-12 rounded-2xl gradient-gold text-accent-foreground font-black group">
                    SUBIR DE PATENTE <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="md:col-span-2">
          <Card className="glass-card bg-orange-500/[0.03] border-orange-500/10">
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-10 h-10 text-orange-500" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-xl font-heading font-black text-orange-500">Recomeçar Missão?</h4>
                <p className="text-sm text-muted-foreground mt-1">Ao resetar, todo seu progresso de questões, simulados e aulas será apagado. Seus dados de conta e assinatura permanecem intactos.</p>
              </div>
              <Button
                disabled={!canReset} onClick={() => setShowResetDialog(true)}
                className="h-14 px-8 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 font-black"
              >
                RESETAR PROCESSO
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="glass-card border-none max-w-md rounded-[2rem] p-8">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="font-heading text-2xl font-black text-foreground">Ação Irreversível</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Você está prestes a apagar <span className="font-black text-foreground underline decoration-orange-500">TODOS</span> os dados de progresso estratégico.
              Esta operação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" className="flex-1 h-12 rounded-2xl" onClick={() => setShowResetDialog(false)}>Manter Dados</Button>
            <Button onClick={handleSelfReset} disabled={resetting} className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20">
              {resetting ? <Loader2 className="animate-spin" /> : "Sim, Resetar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
