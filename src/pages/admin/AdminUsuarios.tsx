/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Search, Ban, CheckCircle, Crown, User, Gift, Clock, ShieldCheck, ShieldOff, AlertTriangle, RotateCcw, TrendingUp, BookOpen, Target, PenLine, Loader2, LayoutGrid, List, Filter, MoreHorizontal, Mail, Calendar, Edit3, Trash2, Zap, Brain, X, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

type MergedUser = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  subscription: { plan: string; status: string; expire_date: string | null } | null;
  roles: { role: string }[];
};

export default function AdminUsuarios() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState("all");

  // Dialogs
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState<{ userId: string; name: string; isAdmin: boolean } | null>(null);
  const [showTeacherConfirm, setShowTeacherConfirm] = useState<{ userId: string; name: string; isTeacher: boolean } | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<{ userId: string; name: string; roles: string[] } | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<{ userId: string; name: string } | null>(null);

  const [grantPlan, setGrantPlan] = useState("premium_mensal");
  const [grantDays, setGrantDays] = useState("30");
  const [trialDays, setTrialDays] = useState("7");
  const [processing, setProcessing] = useState(false);
  const [editName, setEditName] = useState("");

  // Performance View State
  const [showPerformance, setShowPerformance] = useState<{ userId: string; name: string } | null>(null);
  const [userStats, setUserStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchUserStats = async (userId: string) => {
    setLoadingStats(true);
    setUserStats(null);
    try {
      const [progressRes, lessonsRes, essayRes, simRes, answersRes, sessionsRes, flashcardsRes] = await Promise.all([
        supabase.from("user_progress").select("lesson_id").eq("user_id", userId).eq("completed", true),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("essays").select("id, title, score, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("simulation_results").select("*, simulation:simulations(title)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_answers").select("is_correct").eq("user_id", userId),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", userId),
        supabase.from("flashcards").select("id, ease_factor, repetitions, next_review_at").eq("user_id", userId),
      ]);

      const completedCount = progressRes.data?.length || 0;
      const totalLessons = lessonsRes.count || 0;
      const essays = essayRes.data || [];
      const simulations = simRes.data?.map((r: any) => ({ ...r, title: r.simulation?.title })) || [];

      const answers = answersRes.data || [];
      const correctAnswers = answers.filter((a: any) => a.is_correct).length;
      const avgAccuracy = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;

      const totalSeconds = (sessionsRes.data || []).reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0);
      const studyHours = totalSeconds / 3600;

      const flashcards = flashcardsRes.data || [];
      const avgEase = flashcards.length > 0 ? (flashcards.reduce((acc: number, curr: any) => acc + (curr.ease_factor || 0), 0) / flashcards.length).toFixed(2) : "0";

      setUserStats({
        completedLessons: completedCount,
        totalLessons,
        essays,
        essaysCount: essays.length,
        simulations,
        avgAnswerAccuracy: avgAccuracy,
        studyHours,
        totalFlashcards: flashcards.length,
        avgEaseFactor: avgEase,
        flashcardsReviewed: flashcards.filter(f => (f.repetitions || 0) > 0).length,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast.error("Erro ao carregar estatísticas.");
    }
    setLoadingStats(false);
  };

  useEffect(() => {
    if (showPerformance) {
      fetchUserStats(showPerformance.userId);
    }
  }, [showPerformance]);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, subsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const profiles = profilesRes.data ?? [];
    const subs = subsRes.data ?? [];
    const roles = rolesRes.data ?? [];

    const subsMap: Record<string, any> = {};
    subs.forEach(s => { subsMap[s.user_id] = s; });

    const rolesMap: Record<string, any[]> = {};
    roles.forEach(r => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r);
    });

    const merged: MergedUser[] = profiles.map(p => ({
      ...p,
      subscription: subsMap[p.user_id] || null,
      roles: rolesMap[p.user_id] || [],
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- Admin toggle ---
  const handleToggleAdmin = async () => {
    if (!adminUser || !showAdminConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_toggle_role", {
      _admin_user_id: adminUser.id,
      _target_user_id: showAdminConfirm.userId,
      _role: "admin",
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(result.action === "added" ? "Admin concedido!" : "Admin removido!");
      setShowAdminConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  const handleToggleTeacher = async () => {
    if (!adminUser || !showTeacherConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_toggle_role", {
      _admin_user_id: adminUser.id,
      _target_user_id: showTeacherConfirm.userId,
      _role: "teacher",
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(result.action === "added" ? "Professor concedido!" : "Professor removido!");
      setShowTeacherConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Block/Unblock ---
  const handleToggleBlock = async () => {
    if (!adminUser || !showBlockConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_block_user", {
      _admin_user_id: adminUser.id,
      _target_user_id: showBlockConfirm.userId,
      _block: !showBlockConfirm.isBlocked,
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(result.blocked ? "Usuário bloqueado!" : "Usuário desbloqueado!");
      setShowBlockConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Bulk grant subscription ---
  const grantSubscription = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_grant_subscription", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _plan: grantPlan,
      _duration_days: parseInt(grantDays),
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(`Assinatura concedida para ${result.updated} usuário(s)!`);
      setShowGrantDialog(false);
      setSelectedUsers(new Set());
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Bulk grant trial ---
  const grantTrial = async () => {
    if (!adminUser || selectedUsers.size === 0) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_grant_trial", {
      _admin_user_id: adminUser.id,
      _target_user_ids: Array.from(selectedUsers),
      _duration_days: parseInt(trialDays),
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(`Premium Teste concedido para ${result.updated} usuário(s)!`);
      setShowTrialDialog(false);
      setSelectedUsers(new Set());
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Reset user data ---
  const handleResetUser = async () => {
    if (!adminUser || !showResetConfirm) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_reset_user_data", {
      _admin_user_id: adminUser.id,
      _target_user_id: showResetConfirm.userId,
    });
    setProcessing(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(`Progresso de "${showResetConfirm.name}" resetado com sucesso!`);
      setShowResetConfirm(null);
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Bulk remove subscription ---
  const handleRemoveSubscription = async () => {
    if (!adminUser) return;

    // Determine target IDs (either from individual confirm or bulk selection)
    const targetIds = showRevokeConfirm?.userId
      ? [showRevokeConfirm.userId]
      : Array.from(selectedUsers);

    if (targetIds.length === 0) return;

    setProcessing(true);
    const { data, error } = await supabase.rpc("admin_remove_subscription", {
      _admin_user_id: adminUser.id,
      _target_user_ids: targetIds,
    });
    setProcessing(false);

    if (error) { toast.error("Erro: " + error.message); return; }
    const result = data as any;
    if (result && result.success) {
      toast.success(`Assinatura removida com sucesso!`);
      setShowRevokeConfirm(null);
      setSelectedUsers(new Set());
      fetchUsers();
    } else {
      toast.error(result?.error || "Erro desconhecido");
    }
  };

  // --- Selection ---
  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // --- Update Profile ---
  const handleUpdateProfile = async () => {
    if (!adminUser || !showEditDialog) return;
    setProcessing(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name: editName })
      .eq("user_id", showEditDialog.userId);

    if (error) {
      toast.error("Erro ao atualizar nome: " + error.message);
    } else {
      toast.success("Perfil atualizado com sucesso!");
      setShowEditDialog(null);
      fetchUsers();
    }
    setProcessing(false);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const nameMatch = !q || (u.name || "").toLowerCase().includes(q) || (u.user_id || "").toLowerCase().includes(q);

    if (!nameMatch) return false;

    if (filterTab === "all") return true;
    if (filterTab === "admins") return u.roles?.some(r => r.role === "admin");
    if (filterTab === "teachers") return u.roles?.some(r => r.role === "teacher");
    if (filterTab === "premium") return u.subscription?.plan?.startsWith("premium") && u.subscription?.plan !== "premium_teste";
    if (filterTab === "trial") return u.subscription?.plan === "premium_teste";
    if (filterTab === "blocked") return u.subscription?.status === "blocked";
    if (filterTab === "students") return !u.roles?.some(r => r.role === "admin");

    return true;
  });

  const selectAll = () => {
    setSelectedUsers(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(u => u.user_id))
    );
  };

  const planLabels: Record<string, string> = {
    gratuito: "Gratuito", premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", premium_teste: "Premium Teste",
  };
  const planColors: Record<string, string> = {
    gratuito: "bg-muted text-muted-foreground",
    premium_mensal: "bg-primary/10 text-primary border-primary/30",
    premium_anual: "bg-accent/10 text-accent border-accent/30",
    premium_teste: "bg-[hsl(280,70%,55%)]/10 text-[hsl(280,70%,55%)] border-[hsl(280,70%,55%)]/30",
  };

  const durationPresets = [
    { label: "7 dias", value: "7" },
    { label: "15 dias", value: "15" },
    { label: "30 dias (1 mês)", value: "30" },
    { label: "90 dias (3 meses)", value: "90" },
    { label: "180 dias (6 meses)", value: "180" },
    { label: "365 dias (1 ano)", value: "365" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </span>
              Gestão de Usuários
            </h1>
            <p className="text-muted-foreground mt-1">{users.length} usuários cadastrados no total</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedUsers.size > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 mr-4">
                <Badge variant="secondary" className="h-9 px-4 font-bold">
                  {selectedUsers.size} selecionado(s)
                </Badge>
                <Button size="sm" className="gradient-primary text-primary-foreground gap-2 h-9 rounded-xl" onClick={() => setShowGrantDialog(true)}>
                  <Crown className="w-4 h-4" /> Assinatura
                </Button>
                <Button size="sm" variant="outline" className="gap-2 h-9 rounded-xl border-accent/30 text-accent hover:bg-accent/5" onClick={() => setShowTrialDialog(true)}>
                  <Gift className="w-4 h-4" /> Trial
                </Button>
                <Button size="sm" variant="outline" className="gap-2 h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => setShowRevokeConfirm({ userId: "", name: `${selectedUsers.size} usuários` })}>
                  <ShieldOff className="w-4 h-4" /> Revogar
                </Button>
              </motion.div>
            )}
            <Button variant="outline" onClick={fetchUsers} disabled={loading} className="gap-2 h-9 rounded-xl">
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 bg-card/50 border-primary/10 rounded-2xl"
            />
          </div>
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full md:w-auto">
            <TabsList className="bg-card/50 border border-primary/10 p-1 h-12 rounded-2xl">
              <TabsTrigger value="all" className="rounded-xl px-4 data-[state=active]:bg-primary data-[state=active]:text-white">Todos</TabsTrigger>
              <TabsTrigger value="students" className="rounded-xl px-4 data-[state=active]:bg-primary">Alunos</TabsTrigger>
              <TabsTrigger value="teachers" className="rounded-xl px-4 data-[state=active]:bg-blue-600">Professores</TabsTrigger>
              <TabsTrigger value="premium" className="rounded-xl px-4 data-[state=active]:bg-accent">Premium</TabsTrigger>
              <TabsTrigger value="admins" className="rounded-xl px-4 data-[state=active]:bg-purple-600">Admins</TabsTrigger>
              <TabsTrigger value="blocked" className="rounded-xl px-4 data-[state=active]:bg-destructive">Bloqueados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Checkbox id="select-all" checked={selectedUsers.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} />
          <label htmlFor="select-all" className="text-xs font-bold text-muted-foreground uppercase cursor-pointer">
            Selecionar Todos ({filtered.length})
          </label>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono italic">Filtrando por: {filterTab.toUpperCase()}</p>
      </div>

      {/* User List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Carregando mentes brilhantes...</p>
          </div>
        ) : (
          filtered.map(u => {
            const plan = u.subscription?.plan || "gratuito";
            const status = u.subscription?.status || "active";
            const isAdmin = u.roles?.some(r => r.role === "admin");
            const isTeacher = u.roles?.some(r => r.role === "teacher");
            const isBlocked = status === "blocked";
            const isSelected = selectedUsers.has(u.user_id);
            const expireDate = u.subscription?.expire_date;
            const daysLeft = expireDate ? Math.max(0, Math.ceil((new Date(expireDate).getTime() - Date.now()) / 86400000)) : null;

            return (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${isSelected
                  ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/10"
                  : "bg-card/40 border-primary/5 hover:border-primary/20 hover:bg-card/60"
                  } ${isBlocked ? "opacity-60 grayscale-[0.5]" : ""}`}
              >
                <CardContent className="p-5 flex items-center gap-6">
                  {/* Selection Checkbox */}
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectUser(u.user_id)} className="rounded-md w-5 h-5" />

                  {/* User Profile Info */}
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <Avatar className="w-14 h-14 rounded-2xl shadow-xl ring-2 ring-background">
                        <AvatarImage src={u.avatar_url || "/avatar.png"} className="object-cover" />
                        <AvatarFallback className={isAdmin ? "bg-accent/20 text-accent font-bold" : "bg-primary/10 text-primary font-bold"}>
                          {u.name?.charAt(0) || <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 bg-accent text-white p-1 rounded-lg shadow-lg">
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      )}
                      {!isAdmin && isTeacher && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-lg shadow-lg">
                          <GraduationCap className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-base tracking-tight truncate">{u.name || "Membro Sem Nome"}</h3>
                        {isAdmin && <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-bold">ADMIN</Badge>}
                        {isTeacher && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-bold">PROFESSOR</Badge>}
                        {u.subscription?.plan === 'premium_teste' && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">TRIAL</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {(u.user_id || "").slice(0, 8)}...</span>
                        <span className="flex items-center gap-1 font-mono uppercase tracking-tighter opacity-60">
                          <Calendar className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="hidden lg:flex flex-col items-end gap-1 px-6 border-x border-primary/5">
                    <Badge className={`text-[10px] font-black tracking-widest px-3 py-1 border-0 ${planColors[plan] || planColors.gratuito}`}>
                      {planLabels[plan]?.toUpperCase() || plan.toUpperCase()}
                    </Badge>
                    {daysLeft !== null && daysLeft > 0 ? (
                      <span className="text-[10px] font-bold text-accent flex items-center gap-1">
                        Restam {daysLeft} dias
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-40 italic">Acesso Bronze</span>
                    )}
                  </div>

                  {/* Main Actions */}
                  <div className="flex items-center gap-2 pr-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl px-4 gap-2 border-primary/20 hover:bg-primary/10 transition-colors"
                      onClick={() => setShowPerformance({ userId: u.user_id, name: u.name || "Membro" })}
                    >
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="hidden sm:inline font-bold text-xs">Desempenho</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 glass-card p-2 rounded-2xl border-primary/10">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5 px-3">Gestão de Perfil</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="rounded-xl gap-3 text-sm font-medium py-2.5 px-3"
                          onClick={() => {
                            setEditName(u.name || "");
                            setShowEditDialog({ userId: u.user_id, name: u.name, roles: u.roles.map(r => r.role) });
                          }}
                        >
                          <Edit3 className="w-4 h-4 text-primary" /> Editar Nome
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className={`rounded-xl gap-3 text-sm font-medium py-2.5 px-3 ${isAdmin ? "text-destructive" : "text-purple-600"}`}
                          onClick={() => setShowAdminConfirm({ userId: u.user_id, name: u.name || "Membro", isAdmin: !!isAdmin })}
                        >
                          {isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          {isAdmin ? "Remover de Admin" : "Tornar Admin"}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className={`rounded-xl gap-3 text-sm font-medium py-2.5 px-3 ${isTeacher ? "text-destructive" : "text-blue-600"}`}
                          onClick={() => setShowTeacherConfirm({ userId: u.user_id, name: u.name || "Membro", isTeacher: !!isTeacher })}
                        >
                          {isTeacher ? <ShieldOff className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                          {isTeacher ? "Remover de Professor" : "Tornar Professor"}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-primary/5" />

                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5 px-3">Dados & Segurança</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="rounded-xl gap-3 text-sm font-medium py-2.5 px-3 text-orange-500"
                          onClick={() => setShowResetConfirm({ userId: u.user_id, name: u.name || "Membro" })}
                        >
                          <RotateCcw className="w-4 h-4" /> Resetar Progresso
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl gap-3 text-sm font-medium py-2.5 px-3 text-destructive"
                          onClick={() => setShowRevokeConfirm({ userId: u.user_id, name: u.name || "Membro" })}
                        >
                          <ShieldOff className="w-4 h-4" /> Remover Assinatura
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={`rounded-xl gap-3 text-sm font-medium py-2.5 px-3 ${isBlocked ? "text-green-500" : "text-destructive"}`}
                          onClick={() => setShowBlockConfirm({ userId: u.user_id, name: u.name || "Membro", isBlocked })}
                        >
                          {isBlocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          {isBlocked ? "Desbloquear" : "Bloquear Usuário"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </motion.div>
            );
          })
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum usuário encontrado para este filtro.</p>
          </div>
        )}
      </div>

      {/* Admin Confirm Dialog */}
      <Dialog open={!!showAdminConfirm} onOpenChange={() => setShowAdminConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              {showAdminConfirm?.isAdmin ? "Remover Admin" : "Conceder Admin"}
            </DialogTitle>
            <DialogDescription>
              {showAdminConfirm?.isAdmin
                ? `Remover permissões de administrador de "${showAdminConfirm?.name}"? Este usuário perderá acesso ao painel administrativo.`
                : `Conceder permissões de administrador para "${showAdminConfirm?.name}"? Este usuário terá acesso total ao painel administrativo.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAdminConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleToggleAdmin}
              disabled={processing}
              className={showAdminConfirm?.isAdmin ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground"}
            >
              {processing ? "Processando..." : showAdminConfirm?.isAdmin ? "Remover Admin" : "Conceder Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Confirm Dialog */}
      <Dialog open={!!showTeacherConfirm} onOpenChange={() => setShowTeacherConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              {showTeacherConfirm?.isTeacher ? "Remover Professor" : "Conceder Tutor"}
            </DialogTitle>
            <DialogDescription>
              {showTeacherConfirm?.isTeacher
                ? `Remover permissões de professor de "${showTeacherConfirm?.name}"?`
                : `Conceder permissões de professor para "${showTeacherConfirm?.name}"? Este usuário poderá corrigir redações e visualizar alunos.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowTeacherConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleToggleTeacher}
              disabled={processing}
              className={showTeacherConfirm?.isTeacher ? "bg-destructive text-destructive-foreground" : "bg-blue-600 text-white hover:bg-blue-700"}
            >
              {processing ? "Processando..." : showTeacherConfirm?.isTeacher ? "Remover Professor" : "Conceder Professor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Confirm Dialog */}
      <Dialog open={!!showBlockConfirm} onOpenChange={() => setShowBlockConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {showBlockConfirm?.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
            </DialogTitle>
            <DialogDescription>
              {showBlockConfirm?.isBlocked
                ? `Desbloquear "${showBlockConfirm?.name}"? O usuário poderá acessar a plataforma novamente.`
                : `Bloquear "${showBlockConfirm?.name}"? O usuário não poderá acessar a plataforma enquanto estiver bloqueado.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowBlockConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleToggleBlock}
              disabled={processing}
              variant={showBlockConfirm?.isBlocked ? "default" : "destructive"}
            >
              {processing ? "Processando..." : showBlockConfirm?.isBlocked ? "Desbloquear" : "Bloquear Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirm Dialog */}
      <Dialog open={!!showResetConfirm} onOpenChange={() => setShowResetConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Resetar Progresso
            </DialogTitle>
            <DialogDescription>
              Isso vai apagar <span className="font-semibold text-foreground">TODOS</span> os dados de progresso de "{showResetConfirm?.name}" — questões, aulas, conquistas, simulados, redações, diagnóstico e sessões de estudo. Nome, email e assinatura serão preservados. Esta ação é irreversível!
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(null)}>Cancelar</Button>
            <Button onClick={handleResetUser} disabled={processing} className="bg-orange-500 text-white hover:bg-orange-600">
              {processing ? "Processando..." : "Confirmar Reset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Subscription Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Dar Assinatura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conceder assinatura para <span className="font-semibold text-foreground">{selectedUsers.size}</span> usuário(s)
            </p>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={grantPlan} onValueChange={setGrantPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                  <SelectItem value="premium_anual">Premium Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={grantDays} onValueChange={setGrantDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {durationPresets.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantSubscription} disabled={processing} className="w-full gradient-primary text-primary-foreground">
              {processing ? "Processando..." : `Conceder para ${selectedUsers.size} usuário(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Teste Dialog */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Gift className="w-5 h-5 text-[hsl(280,70%,55%)]" /> Premium Teste
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conceder Premium Teste para <span className="font-semibold text-foreground">{selectedUsers.size}</span> usuário(s)
            </p>
            <p className="text-xs text-muted-foreground">Acesso completo a todos os recursos premium durante o período.</p>
            <div className="space-y-2">
              <Label>Duração do Premium Teste</Label>
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantTrial} disabled={processing} className="w-full bg-[hsl(280,70%,55%)] text-white hover:bg-[hsl(280,70%,50%)]">
              {processing ? "Processando..." : `Conceder Premium Teste para ${selectedUsers.size} usuário(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
        <DialogContent className="glass-card max-w-md border-primary/20 p-8 rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </span>
              Editar Perfil
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Altere as informações básicas do membro da comunidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Nome Completo</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-12 border-primary/10 bg-card/50 rounded-xl"
              />
            </div>

            <div className="p-4 bg-muted/20 rounded-2xl border border-border/50">
              <p className="text-[10px] uppercase font-black text-muted-foreground mb-3 tracking-widest">Nível de Acesso em Tempo Real</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {showEditDialog?.roles.includes('admin') ? (
                    <ShieldCheck className="w-5 h-5 text-purple-500" />
                  ) : showEditDialog?.roles.includes('teacher') ? (
                    <GraduationCap className="w-5 h-5 text-blue-500" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                  <span className="text-sm font-bold uppercase">
                    {showEditDialog?.roles.includes('admin') ? "Administrador Elite" : showEditDialog?.roles.includes('teacher') ? "Professor Tutor" : "Membro Aluno"}
                  </span>
                </div>
                <Badge variant="outline" className="border-primary/20 text-xs shadow-sm">Ativo</Badge>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => setShowEditDialog(null)}>Cancelar</Button>
              <Button
                onClick={handleUpdateProfile}
                className="gradient-primary text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
                disabled={processing}
              >
                {processing ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance View Dialog */}
      <Dialog open={!!showPerformance} onOpenChange={() => setShowPerformance(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-primary/10 max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          {loadingStats ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <Brain className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/40" />
              </div>
              <p className="text-muted-foreground font-medium animate-pulse">Sincronizando estatísticas de elite...</p>
            </div>
          ) : !userStats ? (
            <p className="text-center text-muted-foreground py-20">Falha ao carregar o cérebro deste aluno.</p>
          ) : (
            <div className="flex flex-col">
              {/* Profile Header in Modal */}
              <div className="relative p-8 bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-primary/5">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 rounded-3xl shadow-2xl ring-4 ring-background">
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-black">
                      {showPerformance?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">{showPerformance?.name}</h2>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-primary"><Target className="w-4 h-4" /> Desempenho Pro</span>
                      <span className="flex items-center gap-1.5"><Brain className="w-4 h-4" /> Aluno Ativo</span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="absolute top-8 right-8 rounded-full border-primary/10" onClick={() => setShowPerformance(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Aulas", value: userStats.completedLessons, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Precisão", value: `${userStats.avgAnswerAccuracy}%`, icon: Target, color: "text-accent", bg: "bg-accent/10" },
                    { label: "Flashcards", value: userStats.totalFlashcards, icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { label: "Estudo", value: `${userStats.studyHours.toFixed(1)}h`, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" }
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-3xl border border-primary/5 bg-card/40 flex flex-col items-center gap-2 group hover:scale-[1.02] transition-transform`}>
                      <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <p className="text-2xl font-black font-mono tracking-tighter mt-1">{stat.value}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Main Progress Bar */}
                <div className="space-y-3 p-6 rounded-3xl bg-secondary/20 border border-primary/5">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Progresso Geral</p>
                      <p className="text-xl font-bold">Domínio do Conteúdo</p>
                    </div>
                    <span className="text-3xl font-black text-primary">{Math.round((userStats.completedLessons / Math.max(userStats.totalLessons, 1)) * 100)}%</span>
                  </div>
                  <Progress value={(userStats.completedLessons / Math.max(userStats.totalLessons, 1)) * 100} className="h-4 rounded-full bg-primary/10" />
                  <p className="text-[10px] font-bold text-muted-foreground text-center tracking-widest">{userStats.completedLessons} DE {userStats.totalLessons} AULAS CONCLUÍDAS</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detailed Flashcard Stats */}
                  <div className="p-6 rounded-3xl border border-primary/5 bg-card/40 space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-lg"><Zap className="w-5 h-5 text-purple-500" /> Memória Espaçada (SRS)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Ease Factor Médio</p>
                        <p className="text-xl font-bold">{userStats.avgEaseFactor}</p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Revisados</p>
                        <p className="text-xl font-bold">{userStats.flashcardsReviewed}</p>
                      </div>
                    </div>
                  </div>

                  {/* Essays & Sims */}
                  <div className="p-6 rounded-3xl border border-primary/5 bg-card/40 space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-lg"><PenLine className="w-5 h-5 text-accent" /> Produção & Simulados</h3>
                    <div className="space-y-2">
                      {userStats.essays.slice(0, 2).map((e: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/50">
                          <span className="text-xs font-bold truncate max-w-[150px]">{e.title}</span>
                          <Badge className="bg-accent/10 text-accent font-black border-accent/20">{e.score || 'PEND'}</Badge>
                        </div>
                      ))}
                      {userStats.essays.length === 0 && <p className="text-xs italic text-muted-foreground py-2 opacity-50">Nenhuma produção recente.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Permission/Subscription Dialog */}
      <Dialog open={!!showRevokeConfirm} onOpenChange={() => setShowRevokeConfirm(null)}>
        <DialogContent className="glass-card max-w-md border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <ShieldOff className="w-5 h-5" /> Revogar Acesso Premium
            </DialogTitle>
            <DialogDescription>
              Você está prestes a remover o acesso Premium (Assinatura ou Trial) de <span className="font-bold text-foreground">"{showRevokeConfirm?.name}"</span>.
              O usuário voltará para o plano <span className="font-bold text-primary">Gratuito</span> imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowRevokeConfirm(null)}>Cancelar</Button>
            <Button
              onClick={handleRemoveSubscription}
              disabled={processing}
              variant="destructive"
              className="rounded-xl px-6 font-bold shadow-lg shadow-destructive/20"
            >
              {processing ? "Processando..." : "Confirmar Revogação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
