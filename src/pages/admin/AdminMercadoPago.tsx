/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Save, Loader2, Eye, EyeOff, ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";

interface MpSetting {
  key: string;
  value: string;
  label: string;
}

export default function AdminMercadoPago() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [existingSettings, setExistingSettings] = useState<Record<string, string>>({});

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings")
      .select("*")
      .in("key", ["mp_access_token", "mp_public_key", "mp_webhook_url"]);

    const map: Record<string, string> = {};
    data?.forEach((s: any) => { map[s.key] = s.value; });
    setExistingSettings(map);
    setAccessToken(map.mp_access_token || "");
    setPublicKey(map.mp_public_key || "");
    setWebhookUrl(map.mp_webhook_url || `${supabaseUrl}/functions/v1/mp-webhook`);
    setLoading(false);
  };

  const saveSetting = async (key: string, value: string, label: string) => {
    if (existingSettings[key] !== undefined) {
      await supabase.from("platform_settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("platform_settings").insert({
        key,
        value,
        label,
        category: "mercado_pago",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("mp_access_token", accessToken, "Access Token MP"),
        saveSetting("mp_public_key", publicKey, "Public Key MP"),
        saveSetting("mp_webhook_url", webhookUrl, "Webhook URL MP"),
      ]);
      await loadSettings();
      toast.success("Configurações do Mercado Pago salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-preference", {
        body: { plan: "premium_mensal" },
      });

      if (error || data?.error) {
        const msg = data?.error || error?.message || "Erro desconhecido";
        if (msg.includes("MERCADOPAGO_ACCESS_TOKEN")) {
          toast.error("Access Token não configurado no servidor. Atualize o secret MERCADOPAGO_ACCESS_TOKEN.");
        } else {
          toast.warning(`Resposta: ${msg}`);
        }
      } else if (data?.init_point) {
        toast.success("✅ Conexão com Mercado Pago funcionando!");
      }
    } catch (err: any) {
      toast.error("Erro ao testar: " + err.message);
    }
    setTesting(false);
  };

  const maskToken = (token: string) => {
    if (!token || token.length < 12) return token;
    return token.substring(0, 8) + "•".repeat(token.length - 12) + token.substring(token.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Configuração Mercado Pago
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie as credenciais de pagamento da plataforma</p>
      </div>

      {/* Info banner */}
      <Card className="border-[hsl(38,92%,50%)]/30 bg-[hsl(38,92%,50%)]/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[hsl(38,92%,50%)] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Importante sobre o Access Token</p>
            <p className="text-muted-foreground mt-1">
              O Access Token usado pela Edge Function é armazenado como <strong>secret do servidor</strong> (MERCADOPAGO_ACCESS_TOKEN).
              Os campos abaixo servem como referência e backup. Para alterar o token ativo,
              entre em contato com o suporte para atualizar o secret.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Credenciais
          </CardTitle>
          <CardDescription>Dados de integração com o Mercado Pago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="access-token" className="flex items-center gap-2">
              Access Token
              <Badge variant="outline" className="text-[10px]">Privado</Badge>
            </Label>
            <div className="relative">
              <Input
                id="access-token"
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="APP_USR-xxxx..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-key" className="flex items-center gap-2">
              Public Key
              <Badge variant="outline" className="text-[10px]">Público</Badge>
            </Label>
            <Input
              id="public-key"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
              placeholder="APP_USR-xxxx..."
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL (Notificações IPN)</Label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Configure esta URL nas notificações webhook do Mercado Pago
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Status da Integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <span className="text-sm">Access Token (referência)</span>
            <Badge className={accessToken ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-destructive/10 text-destructive"}>
              {accessToken ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <span className="text-sm">Public Key</span>
            <Badge className={publicKey ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-destructive/10 text-destructive"}>
              {publicKey ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <span className="text-sm">Webhook URL</span>
            <Badge className={webhookUrl ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]"}>
              {webhookUrl ? "Configurado" : "Padrão"}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <span className="text-sm">Secret do Servidor (MERCADOPAGO_ACCESS_TOKEN)</span>
            <Badge className="bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]">Ativo</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
