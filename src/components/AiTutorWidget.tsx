import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Compass, AlertTriangle, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function AiTutorWidget() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = async () => {
    setLoading(true);
    setSuggestion("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "suggest_next", messages: [{ role: "user", content: "Qual meu próximo passo de estudo? Seja breve, máximo 3 frases." }] }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              text += content;
              setSuggestion(text);
            }
          } catch {}
        }
      }
    } catch {
      setSuggestion("Não foi possível gerar sugestão. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Tutor IA
          </span>
          <Link to="/ia" className="text-xs text-primary hover:underline">Abrir tutor →</Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestion === null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Seu tutor pessoal analisa seu desempenho e sugere o próximo passo.</p>
            <Button onClick={fetchSuggestion} disabled={loading} size="sm" className="gradient-primary text-primary-foreground gap-2 w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
              {loading ? "Analisando..." : "O que devo estudar agora?"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:mb-1 prose-p:leading-relaxed">
              <ReactMarkdown>{suggestion}</ReactMarkdown>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchSuggestion} disabled={loading} variant="outline" size="sm" className="text-xs gap-1 flex-1">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Compass className="w-3 h-3" />}
                Nova sugestão
              </Button>
              <Link to="/ia" className="flex-1">
                <Button variant="outline" size="sm" className="text-xs gap-1 w-full">
                  <Sparkles className="w-3 h-3" /> Chat completo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
