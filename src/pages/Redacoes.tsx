import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  PenLine, Send, Clock, CheckCircle, Loader2, BookOpen,
  ChevronRight, ArrowLeft, Sparkles, FileText, Star, Calendar,
} from "lucide-react";

interface EssayTheme {
  id: string;
  title: string;
  description: string;
  motivating_texts: any[];
  genre: string;
  active_date: string;
  created_by: string;
}

interface Essay {
  id: string;
  theme_id: string | null;
  title: string;
  content: string;
  status: string;
  score: number | null;
  correction: any;
  corrected_at: string | null;
  created_at: string;
}

type View = "home" | "write" | "history" | "detail" | "correction";

export default function Redacoes() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("home");
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [themesRes, essaysRes, settingsRes] = await Promise.all([
      supabase.from("essay_themes").select("*").order("active_date", { ascending: false }).limit(10),
      supabase.from("essays").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("*").eq("key", "essays_enabled").single(),
    ]);
    setThemes((themesRes.data as any[]) ?? []);
    setEssays((essaysRes.data as any[]) ?? []);
    if (settingsRes.data) setFeatureEnabled(settingsRes.data.value === "true");
  };

  const startWriting = (theme?: EssayTheme) => {
    setSelectedTheme(theme || null);
    setTitle(theme ? theme.title : "");
    setContent("");
    setView("write");
  };

  const submitEssay = async () => {
    if (!user || !content.trim()) return;
    if (content.trim().length < 100) {
      toast.error("A redação deve ter no mínimo 100 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("essays").insert({
        user_id: user.id,
        theme_id: selectedTheme?.id || null,
        title: title.trim() || "Redação sem título",
        content: content.trim(),
        status: "submitted",
      } as any).select().single();

      if (error) throw error;
      toast.success("Redação enviada! Solicitando correção por IA...");
      setView("home");
      loadData();
      // Auto-correct
      if (data) correctEssay((data as any).id, content.trim(), title.trim());
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar redação");
    }
    setSubmitting(false);
  };

  const correctEssay = async (essayId: string, essayContent: string, essayTitle: string) => {
    setCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-correct-essay", {
        body: { essay_id: essayId, content: essayContent, title: essayTitle, theme: selectedTheme?.title },
      });
      if (error) throw error;
      toast.success("Correção concluída!");
      loadData();
    } catch {
      toast.error("Erro na correção automática. Tente novamente mais tarde.");
    }
    setCorrecting(false);
  };

  const viewEssay = (essay: Essay) => {
    setSelectedEssay(essay);
    setView(essay.correction ? "correction" : "detail");
  };

  const retryCorrection = async (essay: Essay) => {
    setCorrecting(true);
    await correctEssay(essay.id, essay.content, essay.title);
    setCorrecting(false);
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const todayTheme = themes.find(t => t.active_date === new Date().toISOString().split("T")[0]);

  if (!featureEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <PenLine className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="font-heading text-xl font-bold">Redações em breve!</h2>
        <p className="text-muted-foreground max-w-md">Este recurso está sendo preparado. Em breve você poderá escrever redações e receber correções por IA.</p>
      </div>
    );
  }

  // Write view
  if (view === "write") {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <Button variant="ghost" onClick={() => setView("home")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        {selectedTheme && (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4">
              <Badge className="mb-2 bg-primary/10 text-primary text-[10px]">TEMA DO DIA</Badge>
              <h3 className="font-heading font-bold">{selectedTheme.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedTheme.description}</p>
              {selectedTheme.motivating_texts && (selectedTheme.motivating_texts as any[]).length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Textos motivadores:</p>
                  {(selectedTheme.motivating_texts as any[]).map((t: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
                      {typeof t === "string" ? t : t.text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da redação"
            className="font-heading font-semibold text-lg border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="relative">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Comece a escrever sua redação aqui..."
            rows={20}
            className="text-base leading-relaxed resize-none"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{wordCount} palavras</span>
            <span>{content.length} caracteres</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Mínimo: 100 caracteres · Recomendado: 20-30 linhas</p>
          <Button
            onClick={submitEssay}
            disabled={submitting || content.trim().length < 100}
            className="gradient-primary text-primary-foreground"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar para Correção
          </Button>
        </div>
      </div>
    );
  }

  // Correction/detail view
  if ((view === "correction" || view === "detail") && selectedEssay) {
    const correction = selectedEssay.correction as any;
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <Button variant="ghost" onClick={() => { setView("home"); setSelectedEssay(null); }} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">{selectedEssay.title}</h1>
          <Badge className={selectedEssay.status === "corrected" ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]"}>
            {selectedEssay.status === "corrected" ? "Corrigida" : "Enviada"}
          </Badge>
        </div>

        {/* Score */}
        {selectedEssay.score !== null && (
          <Card className="glass-card border-accent/20">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full border-4 border-accent flex items-center justify-center">
                <span className="font-heading font-extrabold text-2xl text-accent">{selectedEssay.score}</span>
              </div>
              <div>
                <p className="font-heading font-bold text-lg">Nota da Redação</p>
                <p className="text-sm text-muted-foreground">Escala de 0 a 1000 (padrão ENEM)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Correction feedback */}
        {correction && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Correção por IA
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{typeof correction === "string" ? correction : correction.feedback || JSON.stringify(correction)}</ReactMarkdown>
            </CardContent>
          </Card>
        )}

        {/* Original text */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Sua Redação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{selectedEssay.content}</p>
          </CardContent>
        </Card>

        {selectedEssay.status === "submitted" && (
          <Button onClick={() => retryCorrection(selectedEssay)} disabled={correcting} variant="outline">
            {correcting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Solicitar Correção
          </Button>
        )}
      </div>
    );
  }

  // Home view
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <PenLine className="w-6 h-6 text-primary" /> Redações
          </h1>
          <p className="text-muted-foreground text-sm">Escreva, envie e receba correções por IA</p>
        </div>
        <Button onClick={() => startWriting()} className="gradient-primary text-primary-foreground">
          <PenLine className="w-4 h-4 mr-2" /> Nova Redação
        </Button>
      </div>

      {/* Today's theme */}
      {todayTheme && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 gradient-primary" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Badge className="bg-primary/10 text-primary text-[10px]">TEMA DO DIA</Badge>
                </div>
                <h3 className="font-heading font-bold text-lg">{todayTheme.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{todayTheme.description}</p>
              </div>
              <Button onClick={() => startWriting(todayTheme)} size="sm" className="shrink-0">
                Escrever <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent themes */}
      {themes.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-base mb-3">Temas disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {themes.filter(t => t.id !== todayTheme?.id).slice(0, 4).map(theme => (
              <Card key={theme.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => startWriting(theme)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{theme.genre}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">{theme.created_by === "ai" ? "IA" : "Admin"}</Badge>
                  </div>
                  <p className="font-medium text-sm line-clamp-2">{theme.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Essay history */}
      <div>
        <h2 className="font-heading font-semibold text-base mb-3">Minhas Redações ({essays.length})</h2>
        {essays.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma redação enviada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Escreva sua primeira redação e receba uma correção detalhada por IA!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {essays.map(essay => (
              <Card key={essay.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => viewEssay(essay)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${essay.status === "corrected" ? "bg-[hsl(142,71%,45%)]/10" : "bg-[hsl(38,92%,50%)]/10"}`}>
                      {essay.status === "corrected" ? (
                        <Star className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[hsl(38,92%,50%)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{essay.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(essay.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        {essay.score !== null && (
                          <Badge className="bg-accent/10 text-accent text-[10px]">Nota: {essay.score}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {correcting && (
        <div className="fixed bottom-20 right-4 md:bottom-4 bg-card border border-border rounded-xl p-4 shadow-xl flex items-center gap-3 animate-fade-in z-50">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium">Corrigindo redação...</p>
            <p className="text-[10px] text-muted-foreground">A IA está analisando seu texto</p>
          </div>
        </div>
      )}
    </div>
  );
}
