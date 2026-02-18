/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, CreditCard, RefreshCw, CheckCircle, XCircle, Clock, Zap,
  TrendingUp, TrendingDown, BarChart3, Users, ArrowUpRight, Calendar, Filter, Percent,
  Trash2, MoreHorizontal, MessageSquare, AlertTriangle, Eye,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

export default function AdminPagamentos() {
  const { user } = useAuth();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<string | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ id: string; notes: string } | null>(null);
  const [notesText, setNotesText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [allReqRes] = await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    const allReqs = allReqRes.data ?? [];
    const userIds = [...new Set(allReqs.map(r => r.user_id))];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.name; });
      setAllRequests(allReqs.map(r => ({ ...r, userName: profileMap[r.user_id] || "Sem nome" })));
    } else {
      setAllRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);


  const planLabels: Record<string, string> = { premium_mensal: "Premium Mensal", premium_anual: "Premium Anual", gratuito: "Gratuito" };
  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-[hsl(38,92%,50%)]" />,
    approved: <CheckCircle className="w-4 h-4 text-[hsl(142,71%,45%)]" />,
    rejected: <XCircle className="w-4 h-4 text-destructive" />,
  };
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]" },
    approved: { label: "Aprovado", color: "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" },
    rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  };

  // === Admin Actions ===
  const updateRequestStatus = async (id: string, status: string, notes?: string) => {
    setActionLoading(id);
    const updateData: any = { status, reviewed_at: new Date().toISOString() };
    if (notes) updateData.admin_notes = notes;
    const { error } = await supabase.from("payment_requests").update(updateData).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } else {
      toast.success(`Status atualizado para ${statusLabels[status]?.label || status}`);
      await loadData();
    }
    setActionLoading(null);
  };

  const deleteRequest = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("payment_requests").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Registro excluído");
      await loadData();
    }
    setActionLoading(null);
    setDeleteTarget(null);
  };

  const bulkDeleteByStatus = async (status: string) => {
    const ids = periodRequests.filter(r => r.status === status).map(r => r.id);
    if (ids.length === 0) return;
    setActionLoading("bulk");
    const { error } = await supabase.from("payment_requests").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir em massa: " + error.message);
    } else {
      toast.success(`${ids.length} registro(s) excluído(s)`);
      await loadData();
    }
    setActionLoading(null);
    setBulkDeleteStatus(null);
  };

  const saveNotes = async () => {
    if (!notesDialog) return;
    setActionLoading(notesDialog.id);
    const { error } = await supabase.from("payment_requests").update({
      admin_notes: notesText,
      reviewed_at: new Date().toISOString(),
    }).eq("id", notesDialog.id);
    if (error) {
      toast.error("Erro ao salvar notas");
    } else {
      toast.success("Notas salvas");
      await loadData();
    }
    setActionLoading(null);
    setNotesDialog(null);
  };

  // Filtered by period
  const periodDays = parseInt(period);
  const cutoff = new Date(Date.now() - periodDays * 86400000);

  const periodRequests = useMemo(() => allRequests.filter(r => new Date(r.created_at) >= cutoff), [allRequests, period]);
  const paidRequests = useMemo(() => periodRequests.filter(r => r.status === "approved" && r.mp_payment_id), [periodRequests]);
  const manualRequests = useMemo(() => periodRequests.filter(r => r.status === "approved" && !r.mp_payment_id), [periodRequests]);
  const pendingRequests = useMemo(() => periodRequests.filter(r => r.status === "pending"), [periodRequests]);
  const rejectedRequests = useMemo(() => periodRequests.filter(r => r.status === "rejected"), [periodRequests]);
  const totalRevenue = useMemo(() => paidRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0), [paidRequests]);
  const avgTicket = paidRequests.length > 0 ? totalRevenue / paidRequests.length : 0;
  const conversionRate = periodRequests.length > 0 ? Math.round((paidRequests.length / periodRequests.length) * 100) : 0;

  // Previous period comparison
  const prevCutoff = new Date(cutoff.getTime() - periodDays * 86400000);
  const prevPaid = useMemo(() => allRequests.filter(r => {
    const d = new Date(r.created_at);
    return d >= prevCutoff && d < cutoff && r.status === "approved" && r.mp_payment_id;
  }), [allRequests, period]);
  const prevRevenue = prevPaid.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : totalRevenue > 0 ? 100 : 0;

  // Revenue over time chart data
  const revenueChartData = useMemo(() => {
    const days: Record<string, { date: string; receita: number; transacoes: number }> = {};
    const numDays = periodDays;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = { date: label, receita: 0, transacoes: 0 };
    }
    paidRequests.forEach(r => {
      const key = new Date(r.created_at).toISOString().split("T")[0];
      if (days[key]) {
        days[key].receita += Number(r.amount || 0);
        days[key].transacoes += 1;
      }
    });
    return Object.values(days);
  }, [paidRequests, period]);

  // Plan distribution pie
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    paidRequests.forEach(r => { counts[r.plan] = (counts[r.plan] || 0) + 1; });
    return Object.entries(counts).map(([plan, value]) => ({
      name: planLabels[plan] || plan,
      value,
    }));
  }, [paidRequests]);

  const PIE_COLORS = ["hsl(217, 99%, 50%)", "hsl(43, 76%, 53%)", "hsl(280, 70%, 55%)", "hsl(142, 71%, 45%)"];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Pagamentos & Receita
          </h1>
          <p className="text-muted-foreground text-sm">Mercado Pago integrado • Apenas pagamentos reais contam como receita</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Período:</span>
        {(["7", "30", "90"] as const).map(p => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            className={period === p ? "gradient-primary text-primary-foreground" : ""}
            onClick={() => setPeriod(p)}
          >
            {p} dias
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              {revenueGrowth !== 0 && (
                <Badge className={`text-[10px] ${revenueGrowth > 0 ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-destructive/10 text-destructive"}`}>
                  {revenueGrowth > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(revenueGrowth)}%
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita</p>
            <p className="text-lg font-heading font-bold font-mono">R$ {totalRevenue.toFixed(2).replace(".", ",")}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transações</p>
            <p className="text-lg font-heading font-bold font-mono">{periodRequests.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(142,71%,45%)]/10 flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-[hsl(142,71%,45%)]" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprovados</p>
            <p className="text-lg font-heading font-bold font-mono">{paidRequests.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(38,92%,50%)]/10 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-[hsl(38,92%,50%)]" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendentes</p>
            <p className="text-lg font-heading font-bold font-mono">{pendingRequests.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
            <p className="text-lg font-heading font-bold font-mono">R$ {avgTicket.toFixed(2).replace(".", ",")}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversão</p>
            <p className="text-lg font-heading font-bold font-mono">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue over time */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Receita ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 99%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 99%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                  interval={periodDays <= 7 ? 0 : periodDays <= 30 ? 4 : 13} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]} />
                <Area type="monotone" dataKey="receita" stroke="hsl(217, 99%, 50%)" fillOpacity={1} fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> Por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                    {planDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions bar chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Transações por Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}
                interval={periodDays <= 7 ? 0 : periodDays <= 30 ? 4 : 13} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="transacoes" fill="hsl(43, 76%, 53%)" radius={[4, 4, 0, 0]} name="Transações" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


      {/* Transactions list */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Histórico de Transações
              <Badge variant="outline" className="text-[10px]">{periodRequests.length}</Badge>
            </span>
            <div className="flex items-center gap-2">
              {pendingRequests.length > 0 && (
                <Button variant="outline" size="sm" className="text-xs gap-1 text-[hsl(38,92%,50%)]"
                  onClick={() => setBulkDeleteStatus("pending")}>
                  <Trash2 className="w-3 h-3" /> Limpar Pendentes ({pendingRequests.length})
                </Button>
              )}
              {rejectedRequests.length > 0 && (
                <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive"
                  onClick={() => setBulkDeleteStatus("rejected")}>
                  <Trash2 className="w-3 h-3" /> Limpar Rejeitados ({rejectedRequests.length})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {periodRequests.map(req => {
                const st = statusLabels[req.status] || statusLabels.pending;
                const isLoading = actionLoading === req.id;
                return (
                  <div key={req.id} className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 hover:border-border transition-colors ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {statusIcons[req.status]}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{req.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {planLabels[req.plan] || req.plan}
                          {req.amount && ` • R$ ${Number(req.amount).toFixed(2)}`}
                          {` • ${new Date(req.created_at).toLocaleDateString("pt-BR")}`}
                          {req.mp_payment_id && ` • MP #${req.mp_payment_id}`}
                          {!req.mp_payment_id && req.status === "approved" && " • Manual"}
                        </p>
                        {req.admin_notes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">
                            📝 {req.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={st.color}>{st.label}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDetailDialog(req)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setNotesDialog({ id: req.id, notes: req.admin_notes || "" }); setNotesText(req.admin_notes || ""); }}>
                            <MessageSquare className="w-4 h-4 mr-2" /> Notas do Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {req.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "approved")} className="text-[hsl(142,71%,45%)]">
                                <CheckCircle className="w-4 h-4 mr-2" /> Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "rejected")} className="text-destructive">
                                <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                              </DropdownMenuItem>
                            </>
                          )}
                          {req.status === "approved" && (
                            <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "pending")} className="text-[hsl(38,92%,50%)]">
                              <Clock className="w-4 h-4 mr-2" /> Voltar p/ Pendente
                            </DropdownMenuItem>
                          )}
                          {req.status === "rejected" && (
                            <DropdownMenuItem onClick={() => updateRequestStatus(req.id, "pending")} className="text-[hsl(38,92%,50%)]">
                              <Clock className="w-4 h-4 mr-2" /> Reabrir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(req.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              {periodRequests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação no período selecionado</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual summary */}
      {manualRequests.length > 0 && (
        <Card className="glass-card border-muted-foreground/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{manualRequests.length} concessão(ões) manual(is) no período</p>
              <p className="text-xs text-muted-foreground">Assinaturas concedidas pelo admin não são contabilizadas na receita</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Excluir Registro
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O registro de pagamento será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteRequest(deleteTarget)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={!!bulkDeleteStatus} onOpenChange={() => setBulkDeleteStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Excluir em Massa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros com status "{bulkDeleteStatus === "pending" ? "Pendente" : "Rejeitado"}" no período selecionado serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkDeleteStatus && bulkDeleteByStatus(bulkDeleteStatus)}>
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin notes dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Notas do Administrador
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            placeholder="Adicione observações sobre este pagamento..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancelar</Button>
            <Button onClick={saveNotes} disabled={actionLoading === notesDialog?.id}>Salvar Notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Detalhes da Transação
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Usuário:</span> <span className="font-medium">{detailDialog.userName}</span></div>
                <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium">{planLabels[detailDialog.plan] || detailDialog.plan}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-medium font-mono">R$ {Number(detailDialog.amount || 0).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={statusLabels[detailDialog.status]?.color}>{statusLabels[detailDialog.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Criado em:</span> <span className="font-mono text-xs">{new Date(detailDialog.created_at).toLocaleString("pt-BR")}</span></div>
                {detailDialog.reviewed_at && <div><span className="text-muted-foreground">Revisado em:</span> <span className="font-mono text-xs">{new Date(detailDialog.reviewed_at).toLocaleString("pt-BR")}</span></div>}
                {detailDialog.mp_payment_id && <div className="col-span-2"><span className="text-muted-foreground">MP ID:</span> <span className="font-mono text-xs">{detailDialog.mp_payment_id}</span></div>}
                {detailDialog.mp_status && <div><span className="text-muted-foreground">MP Status:</span> <span className="font-mono text-xs">{detailDialog.mp_status}</span></div>}
              </div>
              {detailDialog.admin_notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notas do Admin:</p>
                  <p className="text-sm">{detailDialog.admin_notes}</p>
                </div>
              )}
              {detailDialog.proof_info && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Comprovante:</p>
                  <p className="text-sm">{detailDialog.proof_info}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
