import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react";

export default function AdminIA() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!resp.ok) throw new Error("Erro na IA");
      const data = await resp.json();
      setResult(data.content || JSON.stringify(data, null, 2));
      toast.success("Conteúdo gerado!");
    } catch (e) {
      toast.error("Erro ao gerar conteúdo");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6" /> IA Administrativa</h1>
      <p className="text-muted-foreground">Gere aulas, questões e simulados automaticamente com IA</p>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: Gere 5 questões de Direito Penal sobre crimes contra a pessoa com alternativas e explicação" rows={4} />
          <Button onClick={generate} disabled={loading} className="gradient-primary text-primary-foreground">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar com IA</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-primary mb-2">Resultado:</p>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
