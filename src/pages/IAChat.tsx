import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PremiumGate from "@/components/PremiumGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function IAChat() {
  return (
    <PremiumGate feature="IA Assistente">
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

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro ao conectar com IA");

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
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar sua solicitação. Tente novamente." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> IA Assistente
        </h1>
        <p className="text-muted-foreground text-sm">Tire dúvidas, peça explicações e crie planos de estudo</p>
      </div>

      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12 space-y-2">
              <Bot className="w-12 h-12 mx-auto text-primary/50" />
              <p>Olá! Sou seu assistente de estudos.</p>
              <p className="text-sm">Pergunte sobre qualquer tema do edital SD PMBA.</p>
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
              {m.role === "user" && <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-gold" /></div>}
            </div>
          ))}
          <div ref={endRef} />
        </CardContent>

        <div className="p-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite sua dúvida..." className="flex-1" disabled={loading} />
            <Button type="submit" disabled={loading || !input.trim()} className="gradient-primary text-primary-foreground">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
