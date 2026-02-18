/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, BookOpen, HelpCircle, Sparkles, CheckCircle2, Zap, Brain, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AdminIA() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [savedInfo, setSavedInfo] = useState<{ saved: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("lessons");

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSubject) { setTopics([]); return; }
    supabase.from("topics").select("*").eq("subject_id", selectedSubject).order("order_index").then(({ data }) => setTopics(data ?? []));
  }, [selectedSubject]);

  const generate = async () => {
    if (!prompt.trim()) { toast.error("Digite um prompt"); return; }
    if (tab === "lessons" && !selectedTopic) { toast.error("Selecione matéria e assunto"); return; }
    if (tab === "questions" && !selectedSubject) { toast.error("Selecione uma matéria"); return; }

    setLoading(true);
    setResult("");
    setSavedInfo(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Você precisa estar logado"); setLoading(false); return; }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          action: tab === "lessons" ? "generate_lessons" : tab === "questions" ? "generate_questions" : "general",
          subject_id: selectedSubject || undefined,
          topic_id: selectedTopic || undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro na IA");
      }

      const data = await resp.json();
      setResult(data.content || JSON.stringify(data, null, 2));

      if (data.action === "lessons_saved") {
        setSavedInfo({ saved: data.saved, total: data.total });
        toast.success(`${data.saved}/${data.total} aulas salvas no banco!`);
      } else if (data.action === "questions_saved") {
        setSavedInfo({ saved: data.saved, total: data.total });
        toast.success(`${data.saved}/${data.total} questões salvas no banco!`);
      } else if (data.error_parse) {
        toast.warning(data.error_parse);
      } else {
        toast.success("Conteúdo gerado!");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo");
    }
    setLoading(false);
  };

  const subjectName = subjects.find(s => s.id === selectedSubject)?.name || "";

  const quickPrompts: Record<string, string[]> = {
    lessons: [
      `Gere 5 aulas completas sobre ${subjectName || "a matéria selecionada"} com conteúdo detalhado, exemplos práticos e dicas para prova`,
      `Crie aulas sobre os pontos mais cobrados de ${subjectName || "a matéria"} no concurso SD PMBA`,
    ],
    questions: [
      `Gere 10 questões de ${subjectName || "a matéria"} no estilo CESPE/CEBRASPE com alternativas e explicação detalhada`,
      `Crie 5 questões difíceis de ${subjectName || "a matéria"} focadas nos temas mais cobrados`,
    ],
    general: [
      "Crie um resumo completo dos pontos mais cobrados do edital SD PMBA",
      "Liste as 20 súmulas mais cobradas em concursos militares",
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Brain className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">IA Administrativa</h1>
          <p className="text-muted-foreground text-sm">Gere e publique conteúdo automaticamente com inteligência artificial</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border h-12 p-1 gap-1">
          <TabsTrigger value="lessons" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
            <BookOpen className="w-4 h-4" /> Aulas
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
            <HelpCircle className="w-4 h-4" /> Questões
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
            <FileText className="w-4 h-4" /> Geral
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="mt-6">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" /> Gerador de Aulas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Matéria</Label>
                  <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopic(""); }}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assunto (destino)</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o assunto..." /></SelectTrigger>
                    <SelectContent>
                      {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Prompt</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={`Ex: Gere 3 aulas completas sobre ${subjectName || "Direito Penal"} com conteúdo detalhado, exemplos e dicas`}
                  rows={4} className="resize-none" />
              </div>

              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2">
                {quickPrompts.lessons.map((qp, i) => (
                  <button key={i} onClick={() => setPrompt(qp)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all">
                    <Zap className="w-3 h-3 inline mr-1" />{qp.slice(0, 50)}…
                  </button>
                ))}
              </div>

              <Button onClick={generate} disabled={loading} className="gradient-primary text-primary-foreground w-full h-12 text-base font-semibold shadow-lg shadow-primary/20">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando e salvando...</> : <><Send className="w-5 h-5 mr-2" /> Gerar e Publicar Aulas</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-gold/5 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" /> Gerador de Questões
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Matéria</Label>
                  <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopic(""); }}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a matéria..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assunto (opcional)</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Todos os assuntos" /></SelectTrigger>
                    <SelectContent>
                      {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Prompt</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={`Ex: Gere 10 questões de ${subjectName || "Direito Constitucional"} com alternativas e explicação detalhada`}
                  rows={4} className="resize-none" />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.questions.map((qp, i) => (
                  <button key={i} onClick={() => setPrompt(qp)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/30 hover:bg-gold/5 transition-all">
                    <Zap className="w-3 h-3 inline mr-1" />{qp.slice(0, 50)}…
                  </button>
                ))}
              </div>

              <Button onClick={generate} disabled={loading} className="gradient-gold text-accent-foreground w-full h-12 text-base font-semibold shadow-lg shadow-gold/20">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando e salvando...</> : <><Send className="w-5 h-5 mr-2" /> Gerar e Publicar Questões</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-highlight/5 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-highlight" /> Prompt Livre
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Prompt</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Ex: Crie um plano de estudos de 30 dias para o concurso SD PMBA..."
                  rows={5} className="resize-none" />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.general.map((qp, i) => (
                  <button key={i} onClick={() => setPrompt(qp)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-highlight/30 hover:bg-highlight/5 transition-all">
                    <Zap className="w-3 h-3 inline mr-1" />{qp.slice(0, 50)}…
                  </button>
                ))}
              </div>

              <Button onClick={generate} disabled={loading} className="bg-highlight hover:bg-highlight/90 text-accent-foreground w-full h-12 text-base font-semibold shadow-lg shadow-highlight/20">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</> : <><Send className="w-5 h-5 mr-2" /> Gerar com IA</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save confirmation */}
      {savedInfo && (
        <Card className="border-green-500/30 bg-green-500/5 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400">Conteúdo publicado com sucesso!</p>
              <p className="text-xs text-green-400/70">{savedInfo.saved}/{savedInfo.total} itens salvos no banco de dados</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output rendered as markdown */}
      {result && (
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" /> Conteúdo Gerado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-invert prose-sm max-w-none max-h-[600px] overflow-y-auto
              prose-headings:font-heading prose-headings:text-foreground
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
              prose-p:text-muted-foreground prose-p:mb-3 prose-p:leading-relaxed
              prose-strong:text-foreground
              prose-li:text-muted-foreground
              prose-code:text-gold prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-a:text-primary">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
