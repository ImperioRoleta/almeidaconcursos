import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Loader2, BookOpen, HelpCircle, Sparkles, CheckCircle2 } from "lucide-react";

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
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gold" /> IA Administrativa
        </h1>
        <p className="text-muted-foreground">Gere e publique aulas e questões automaticamente com IA</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="lessons" className="gap-2"><BookOpen className="w-4 h-4" /> Gerar Aulas</TabsTrigger>
          <TabsTrigger value="questions" className="gap-2"><HelpCircle className="w-4 h-4" /> Gerar Questões</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><MessageSquare className="w-4 h-4" /> Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Matéria</Label>
                  <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopic(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assunto (as aulas serão salvas aqui)</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Prompt</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={`Ex: Gere 3 aulas completas sobre ${subjectName || "Direito Penal"} com conteúdo detalhado, exemplos e dicas para prova`}
                  rows={4} />
              </div>
              <Button onClick={generate} disabled={loading} className="gradient-primary text-primary-foreground w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando e salvando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar e Publicar Aulas</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Matéria</Label>
                  <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopic(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assunto (opcional)</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger><SelectValue placeholder="Todos os assuntos" /></SelectTrigger>
                    <SelectContent>
                      {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Prompt</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={`Ex: Gere 10 questões de ${subjectName || "Direito Constitucional"} sobre direitos fundamentais com alternativas e explicação detalhada`}
                  rows={4} />
              </div>
              <Button onClick={generate} disabled={loading} className="gradient-primary text-primary-foreground w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando e salvando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar e Publicar Questões</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Prompt livre</Label>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Ex: Crie um plano de estudos de 30 dias para o concurso SD PMBA..."
                  rows={4} />
              </div>
              <Button onClick={generate} disabled={loading} className="gradient-primary text-primary-foreground w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar com IA</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {savedInfo && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-sm font-medium text-green-400">
              {savedInfo.saved}/{savedInfo.total} itens salvos com sucesso no banco de dados!
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-primary">Conteúdo Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono max-h-[500px] overflow-y-auto">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
