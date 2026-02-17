import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PremiumGate from "@/components/PremiumGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Bot, User, Compass, AlertTriangle, BookOpen, Sparkles, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const TUTOR_ACTIONS = [
  { key: "suggest_next", label: "Próximo passo", icon: Compass, description: "O que devo estudar agora?" },
  { key: "explain_errors", label: "Explicar erros", icon: AlertTriangle, description: "Por que estou errando?" },
  { key: "generate_questions", label: "Gerar questões", icon: BookOpen, description: "Questões personalizadas" },
  { key: "analyze_performance", label: "Análise completa", icon: BarChart3, description: "Diagnóstico do meu desempenho" },
];

export default function IAChat() {
  return (
    <PremiumGate feature="Tutor IA">
      <IAChatContent />
    </PremiumGate>
  );
}

function IAChatContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const streamResponse = async (body: Record<string, unknown>) => {
    setLoading(true);
    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Erro ao processar sua solicitação. Tente novamente."}` }]);
    }
    setLoading(false);
  };

  const handleAction = async (actionKey: string) => {
    if (loading) return;
    const action = TUTOR_ACTIONS.find(a => a.key === actionKey);
    const userMsg: Msg = { role: "user", content: `🎯 ${action?.description || actionKey}` };
    setMessages(prev => [...prev, userMsg]);
    await streamResponse({ action: actionKey, messages: [{ role: "user", content: action?.description }] });
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    await streamResponse({ action: "chat", messages: allMessages });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Tutor IA Pessoal
        </h1>
        <p className="text-muted-foreground text-sm">Seu tutor analisa seu desempenho e guia seus estudos</p>
      </div>

      {/* Quick Action Buttons */}
      {messages.length === 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TUTOR_ACTIONS.map(action => (
            <Button
              key={action.key}
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => handleAction(action.key)}
              disabled={loading}
            >
              <div className="flex items-center gap-2">
                <action.icon className="w-4 h-4 text-primary" />
                <span className="font-heading font-semibold text-sm">{action.label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{action.description}</span>
            </Button>
          ))}
        </div>
      )}

      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12 space-y-2">
              <Bot className="w-12 h-12 mx-auto text-primary/50" />
              <p className="font-heading font-semibold">Seu Tutor IA está pronto!</p>
              <p className="text-sm">Escolha uma ação acima ou pergunte qualquer coisa sobre o edital SD PMBA.</p>
              <p className="text-xs text-muted-foreground/60">Eu conheço seu desempenho e personalizo tudo para você.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>}
              <div className={`max-w-[80%] rounded-xl p-4 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:mb-2 prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-li:mb-0.5">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span>{m.content}</span>
                )}
              </div>
              {m.role === "user" && <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-accent" /></div>}
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary animate-pulse" /></div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>

        {/* Inline quick actions when conversation is active */}
        {messages.length > 0 && !loading && (
          <div className="px-4 pt-2 flex gap-1.5 flex-wrap">
            {TUTOR_ACTIONS.map(action => (
              <Button key={action.key} variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground hover:text-primary" onClick={() => handleAction(action.key)}>
                <action.icon className="w-3 h-3" /> {action.label}
              </Button>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte ao seu tutor..." className="flex-1" disabled={loading} />
            <Button type="submit" disabled={loading || !input.trim()} className="gradient-primary text-primary-foreground">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
