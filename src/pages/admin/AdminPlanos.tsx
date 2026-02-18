/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package, Plus, Edit, Trash2, Eye, EyeOff, Crown, Tag, Percent, Calendar,
  Image, GripVertical, Star, Ban, RefreshCw, Copy, Zap, Gift, TicketPercent,
  CheckCircle, XCircle, Clock, TrendingUp, Upload,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  billing_period: string;
  features: string[];
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_blocked: boolean;
  order_index: number;
  badge_text: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  applicable_plans: string[];
  min_amount: number | null;
  is_active: boolean;
  created_at: string;
}

const emptyPlan = {
  name: "", slug: "", description: "", price: 0, original_price: null as number | null,
  billing_period: "monthly", features: [] as string[], image_url: null as string | null,
  is_active: true, is_featured: false, is_blocked: false, order_index: 0,
  badge_text: "", color: "hsl(217, 99%, 50%)",
};

const emptyCoupon = {
  code: "", description: "", discount_type: "percentage", discount_value: 0,
  max_uses: null as number | null, valid_from: new Date().toISOString().slice(0, 16),
  valid_until: "", applicable_plans: [] as string[], min_amount: 0, is_active: true,
};

export default function AdminPlanos() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDialog, setPlanDialog] = useState(false);
  const [couponDialog, setCouponDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<typeof emptyPlan & { id?: string }>(emptyPlan);
  const [editingCoupon, setEditingCoupon] = useState<typeof emptyCoupon & { id?: string }>(emptyCoupon);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "plan" | "coupon"; id: string; name: string } | null>(null);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from("plans").select("*").order("order_index"),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    ]);
    setPlans((p.data ?? []) as Plan[]);
    setCoupons((c.data ?? []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Plan CRUD
  const openPlanDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan({
        id: plan.id, name: plan.name, slug: plan.slug, description: plan.description || "",
        price: plan.price, original_price: plan.original_price, billing_period: plan.billing_period,
        features: plan.features || [], image_url: plan.image_url, is_active: plan.is_active,
        is_featured: plan.is_featured, is_blocked: plan.is_blocked, order_index: plan.order_index,
        badge_text: plan.badge_text || "", color: plan.color || "hsl(217, 99%, 50%)",
      });
    } else {
      setEditingPlan({ ...emptyPlan, order_index: plans.length });
    }
    setFeatureInput("");
    setPlanDialog(true);
  };

  const savePlan = async () => {
    if (!editingPlan.name || !editingPlan.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    const data = {
      name: editingPlan.name,
      slug: editingPlan.slug,
      description: editingPlan.description || null,
      price: editingPlan.price,
      original_price: editingPlan.original_price || null,
      billing_period: editingPlan.billing_period,
      features: editingPlan.features as any,
      image_url: editingPlan.image_url,
      is_active: editingPlan.is_active,
      is_featured: editingPlan.is_featured,
      is_blocked: editingPlan.is_blocked,
      order_index: editingPlan.order_index,
      badge_text: editingPlan.badge_text || null,
      color: editingPlan.color || null,
    };

    console.log("Saving plan data:", data);

    const { error } = editingPlan.id
      ? await supabase.from("plans").update(data).eq("id", editingPlan.id)
      : await supabase.from("plans").insert(data);

    if (error) {
      console.error("Error saving plan:", error);
      toast.error("Erro: " + error.message);
    } else {
      toast.success(editingPlan.id ? "Plano atualizado!" : "Plano criado!");
      setPlanDialog(false);
      await loadData();
    }
    setSaving(false);
  };

  const togglePlanActive = async (id: string, active: boolean) => {
    await supabase.from("plans").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Plano ativado" : "Plano desativado");
    loadData();
  };

  const togglePlanBlocked = async (id: string, blocked: boolean) => {
    await supabase.from("plans").update({ is_blocked: blocked }).eq("id", id);
    toast.success(blocked ? "Plano bloqueado" : "Plano desbloqueado");
    loadData();
  };

  const togglePlanFeatured = async (id: string, featured: boolean) => {
    await supabase.from("plans").update({ is_featured: featured }).eq("id", id);
    toast.success(featured ? "Plano destacado" : "Destaque removido");
    loadData();
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("plan-images").upload(path, file);
    if (error) {
      toast.error("Erro no upload: " + error.message);
    } else {
      const { data } = supabase.storage.from("plan-images").getPublicUrl(path);
      setEditingPlan(prev => ({ ...prev, image_url: data.publicUrl }));
      toast.success("Imagem enviada!");
    }
    setUploadingImage(false);
  };

  // Features management
  const addFeature = () => {
    if (!featureInput.trim()) return;
    setEditingPlan(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
    setFeatureInput("");
  };
  const removeFeature = (index: number) => {
    setEditingPlan(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  // Coupon CRUD
  const openCouponDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon({
        id: coupon.id, code: coupon.code, description: coupon.description || "",
        discount_type: coupon.discount_type, discount_value: coupon.discount_value,
        max_uses: coupon.max_uses, valid_from: coupon.valid_from?.slice(0, 16) || "",
        valid_until: coupon.valid_until?.slice(0, 16) || "",
        applicable_plans: coupon.applicable_plans || [], min_amount: coupon.min_amount || 0,
        is_active: coupon.is_active,
      });
    } else {
      setEditingCoupon({ ...emptyCoupon, valid_from: new Date().toISOString().slice(0, 16) });
    }
    setCouponDialog(true);
  };

  const saveCoupon = async () => {
    if (!editingCoupon.code) {
      toast.error("Código é obrigatório");
      return;
    }
    setSaving(true);
    const data = {
      code: editingCoupon.code.toUpperCase(),
      description: editingCoupon.description || null,
      discount_type: editingCoupon.discount_type,
      discount_value: editingCoupon.discount_value,
      max_uses: editingCoupon.max_uses || null,
      valid_from: editingCoupon.valid_from || new Date().toISOString(),
      valid_until: editingCoupon.valid_until || null,
      applicable_plans: editingCoupon.applicable_plans as any,
      min_amount: editingCoupon.min_amount || 0,
      is_active: editingCoupon.is_active,
    };

    const { error } = editingCoupon.id
      ? await supabase.from("coupons").update(data).eq("id", editingCoupon.id)
      : await supabase.from("coupons").insert(data);

    if (error) toast.error("Erro: " + error.message);
    else { toast.success(editingCoupon.id ? "Cupom atualizado!" : "Cupom criado!"); setCouponDialog(false); await loadData(); }
    setSaving(false);
  };

  const toggleCouponActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Cupom ativado" : "Cupom desativado");
    loadData();
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = deleteTarget.type === "plan"
      ? await supabase.from("plans").delete().eq("id", deleteTarget.id)
      : await supabase.from("coupons").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Excluído com sucesso"); await loadData(); }
    setDeleteTarget(null);
  };

  const periodLabels: Record<string, string> = { free: "Gratuito", monthly: "Mensal", annual: "Anual", one_time: "Único" };
  const activePlans = plans.filter(p => p.is_active && !p.is_blocked);
  const activeCoupons = coupons.filter(c => c.is_active);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Gestão de Planos & Promoções
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie planos, cupons e promoções da plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Planos</p>
              <p className="text-xl font-heading font-bold font-mono">{plans.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[hsl(142,71%,45%)]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ativos</p>
              <p className="text-xl font-heading font-bold font-mono">{activePlans.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TicketPercent className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cupons</p>
              <p className="text-xl font-heading font-bold font-mono">{coupons.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(280,70%,55%)]/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-[hsl(280,70%,55%)]" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cupons Ativos</p>
              <p className="text-xl font-heading font-bold font-mono">{activeCoupons.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plans" className="gap-2"><Crown className="w-4 h-4" /> Planos</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2"><TicketPercent className="w-4 h-4" /> Cupons</TabsTrigger>
        </TabsList>

        {/* ===== PLANS TAB ===== */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{plans.length} plano(s) cadastrado(s)</p>
            <Button onClick={() => openPlanDialog()} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Novo Plano
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Card key={plan.id} className={`glass-card relative overflow-hidden transition-all ${plan.is_blocked ? "opacity-60 border-destructive/30" : plan.is_featured ? "border-primary/40 shadow-lg shadow-primary/10" : ""}`}>
                  {plan.is_blocked && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive text-[10px] text-center py-1 font-medium">
                      <Ban className="w-3 h-3 inline mr-1" /> BLOQUEADO
                    </div>
                  )}
                  {plan.image_url && (
                    <div className="h-32 overflow-hidden">
                      <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className={`p-4 space-y-3 ${plan.is_blocked ? "pt-8" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-lg">{plan.name}</h3>
                          {plan.is_featured && <Star className="w-4 h-4 text-accent fill-accent" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.slug} • {periodLabels[plan.billing_period] || plan.billing_period}</p>
                      </div>
                      <div className="flex gap-1">
                        <Badge className={plan.is_active ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-muted text-muted-foreground"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>

                    {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-heading font-bold font-mono">
                        R$ {plan.price.toFixed(2).replace(".", ",")}
                      </span>
                      {plan.original_price && plan.original_price > plan.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {plan.original_price.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      {plan.original_price && plan.original_price > plan.price && (
                        <Badge className="bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] text-[10px]">
                          -{Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)}%
                        </Badge>
                      )}
                    </div>

                    {plan.badge_text && (
                      <Badge variant="outline" className="text-[10px]">{plan.badge_text}</Badge>
                    )}

                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{f}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-[10px] text-muted-foreground">+{plan.features.length - 4} mais...</li>
                        )}
                      </ul>
                    )}

                    <div className="flex gap-1.5 pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openPlanDialog(plan)}>
                        <Edit className="w-3 h-3" /> Editar
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => togglePlanActive(plan.id, !plan.is_active)} title={plan.is_active ? "Desativar" : "Ativar"}>
                        {plan.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => togglePlanFeatured(plan.id, !plan.is_featured)} title={plan.is_featured ? "Remover destaque" : "Destacar"}>
                        <Star className={`w-3.5 h-3.5 ${plan.is_featured ? "text-accent fill-accent" : ""}`} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => togglePlanBlocked(plan.id, !plan.is_blocked)} title={plan.is_blocked ? "Desbloquear" : "Bloquear"}>
                        <Ban className={`w-3.5 h-3.5 ${plan.is_blocked ? "text-destructive" : ""}`} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "plan", id: plan.id, name: plan.name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== COUPONS TAB ===== */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{coupons.length} cupom(ns) cadastrado(s)</p>
            <Button onClick={() => openCouponDialog()} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Novo Cupom
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map(coupon => {
                const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                const usedUp = coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;
                return (
                  <Card key={coupon.id} className={`glass-card ${isExpired || usedUp ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <TicketPercent className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-lg">{coupon.code}</code>
                            <Badge className={coupon.is_active && !isExpired && !usedUp ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-muted text-muted-foreground"}>
                              {isExpired ? "Expirado" : usedUp ? "Esgotado" : coupon.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `R$ ${coupon.discount_value.toFixed(2)} off`}
                            {coupon.max_uses && ` • ${coupon.current_uses}/${coupon.max_uses} usos`}
                            {coupon.valid_until && ` • Até ${new Date(coupon.valid_until).toLocaleDateString("pt-BR")}`}
                            {coupon.description && ` • ${coupon.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openCouponDialog(coupon)}>
                          <Edit className="w-3 h-3" /> Editar
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toggleCouponActive(coupon.id, !coupon.is_active)}>
                          {coupon.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Código copiado!"); }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "coupon", id: coupon.id, name: coupon.code })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {coupons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cupom cadastrado</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== PLAN DIALOG ===== */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {editingPlan.id ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))} placeholder="Premium Mensal" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug * (identificador único)</Label>
                <Input value={editingPlan.slug} onChange={e => setEditingPlan(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} placeholder="premium_mensal" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={editingPlan.description} onChange={e => setEditingPlan(p => ({ ...p, description: e.target.value }))} placeholder="Descrição curta do plano..." rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" value={editingPlan.price} onChange={e => setEditingPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Preço Original (R$)</Label>
                <Input type="number" step="0.01" value={editingPlan.original_price || ""} onChange={e => setEditingPlan(p => ({ ...p, original_price: parseFloat(e.target.value) || null }))} placeholder="Para promoções" />
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select value={editingPlan.billing_period} onValueChange={v => setEditingPlan(p => ({ ...p, billing_period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_time">Pagamento Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Badge (selo)</Label>
                <Input value={editingPlan.badge_text} onChange={e => setEditingPlan(p => ({ ...p, badge_text: e.target.value }))} placeholder="Mais Popular" />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" value={editingPlan.order_index} onChange={e => setEditingPlan(p => ({ ...p, order_index: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Imagem (opcional)</Label>
              <div className="flex gap-3 items-center">
                {editingPlan.image_url && (
                  <img src={editingPlan.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
                )}
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                  {uploadingImage && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
                </div>
                {editingPlan.image_url && (
                  <Button variant="outline" size="sm" onClick={() => setEditingPlan(p => ({ ...p, image_url: null }))}>Remover</Button>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1.5">
              <Label>Recursos incluídos</Label>
              <div className="flex gap-2">
                <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="Ex: Questões ilimitadas" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} />
                <Button variant="outline" onClick={addFeature}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1 mt-2">
                {editingPlan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="flex-1">{f}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFeature(i)}>
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Switches */}
            <div className="flex flex-wrap gap-6 py-2">
              <div className="flex items-center gap-2">
                <Switch checked={editingPlan.is_active} onCheckedChange={v => setEditingPlan(p => ({ ...p, is_active: v }))} />
                <Label className="text-sm">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingPlan.is_featured} onCheckedChange={v => setEditingPlan(p => ({ ...p, is_featured: v }))} />
                <Label className="text-sm">Destacado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingPlan.is_blocked} onCheckedChange={v => setEditingPlan(p => ({ ...p, is_blocked: v }))} />
                <Label className="text-sm">Bloqueado</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(false)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={saving}>{saving ? "Salvando..." : editingPlan.id ? "Atualizar" : "Criar Plano"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== COUPON DIALOG ===== */}
      <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketPercent className="w-5 h-5 text-accent" />
              {editingCoupon.id ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={editingCoupon.code} onChange={e => setEditingCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="PROMO2025" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Desconto</Label>
                <Select value={editingCoupon.discount_type} onValueChange={v => setEditingCoupon(c => ({ ...c, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor do Desconto</Label>
                <Input type="number" step="0.01" value={editingCoupon.discount_value} onChange={e => setEditingCoupon(c => ({ ...c, discount_value: parseFloat(e.target.value) || 0 }))} placeholder={editingCoupon.discount_type === "percentage" ? "10" : "5.00"} />
              </div>
              <div className="space-y-1.5">
                <Label>Máximo de Usos</Label>
                <Input type="number" value={editingCoupon.max_uses || ""} onChange={e => setEditingCoupon(c => ({ ...c, max_uses: parseInt(e.target.value) || null }))} placeholder="Ilimitado" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={editingCoupon.description} onChange={e => setEditingCoupon(c => ({ ...c, description: e.target.value }))} placeholder="Promoção de lançamento" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Válido de</Label>
                <Input type="datetime-local" value={editingCoupon.valid_from} onChange={e => setEditingCoupon(c => ({ ...c, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Válido até</Label>
                <Input type="datetime-local" value={editingCoupon.valid_until} onChange={e => setEditingCoupon(c => ({ ...c, valid_until: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Planos Aplicáveis</Label>
              <p className="text-xs text-muted-foreground">Selecione os planos. Vazio = todos os planos.</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {plans.filter(p => p.price > 0).map(plan => {
                  const selected = editingCoupon.applicable_plans.includes(plan.slug);
                  return (
                    <Badge
                      key={plan.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setEditingCoupon(c => ({
                        ...c,
                        applicable_plans: selected
                          ? c.applicable_plans.filter(s => s !== plan.slug)
                          : [...c.applicable_plans, plan.slug]
                      }))}
                    >
                      {plan.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editingCoupon.is_active} onCheckedChange={v => setEditingCoupon(c => ({ ...c, is_active: v }))} />
              <Label className="text-sm">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialog(false)}>Cancelar</Button>
            <Button onClick={saveCoupon} disabled={saving}>{saving ? "Salvando..." : editingCoupon.id ? "Atualizar" : "Criar Cupom"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.type === "plan" ? "Plano" : "Cupom"}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
