import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Loader2, RefreshCw } from "lucide-react";

interface FeatureSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
}

export default function AdminFuncionalidades() {
  const [settings, setSettings] = useState<FeatureSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [generatingTheme, setGeneratingTheme] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("platform_settings").select("*").eq("category", "features").order("key");
    setSettings((data as FeatureSetting[]) ?? []);
    setLoading(false);
  };

  const toggleSetting = async (setting: FeatureSetting) => {
    const newValue = setting.value === "true" ? "false" : "true";
    setSaving(setting.id);
    const { error } = await supabase.from("platform_settings").update({ value: newValue }).eq("id", setting.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } else {
      toast.success(`${setting.label} ${newValue === "true" ? "ativado" : "desativado"}`);
      setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newValue } : s));
    }
    setSaving(null);
  };

  const generateDailyTheme = async () => {
    setGeneratingTheme(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-theme");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.title ? `Tema gerado: ${data.title}` : "Tema do dia gerado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar tema");
    }
    setGeneratingTheme(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Funcionalidades
        </h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Ativar / Desativar Recursos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : settings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma configuração de funcionalidade encontrada.</p>
          ) : (
            settings.map(setting => (
              <div key={setting.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <Label className="font-medium">{setting.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Chave: {setting.key}</p>
                </div>
                <Switch
                  checked={setting.value === "true"}
                  onCheckedChange={() => toggleSetting(setting)}
                  disabled={saving === setting.id}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Redações - Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gere manualmente o tema de redação do dia. Normalmente isso é feito automaticamente via agendamento.
          </p>
          <Button onClick={generateDailyTheme} disabled={generatingTheme} variant="outline">
            {generatingTheme ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Gerar Tema do Dia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
