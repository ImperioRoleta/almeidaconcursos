import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { HelpCircle, Plus, Trash2 } from "lucide-react";

export default function AdminQuestoes() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [opts, setOpts] = useState([
    { label: "A", text: "", is_correct: true },
    { label: "B", text: "", is_correct: false },
    { label: "C", text: "", is_correct: false },
    { label: "D", text: "", is_correct: false },
  ]);

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    supabase.from("questions").select("*, question_options(*)").eq("subject_id", selectedSubject).order("created_at", { ascending: false }).then(({ data }) => setQuestions(data ?? []));
  }, [selectedSubject]);

  const addQuestion = async () => {
    if (!statement.trim() || !selectedSubject) return;
    const { data: q } = await supabase.from("questions").insert({
      subject_id: selectedSubject,
      statement,
      explanation,
      difficulty,
    }).select().single();
    if (!q) return;

    for (const o of opts) {
      await supabase.from("question_options").insert({ question_id: q.id, label: o.label, text: o.text, is_correct: o.is_correct });
    }

    toast.success("Questão adicionada");
    setDialogOpen(false);
    setStatement(""); setExplanation("");
    setOpts([{ label: "A", text: "", is_correct: true }, { label: "B", text: "", is_correct: false }, { label: "C", text: "", is_correct: false }, { label: "D", text: "", is_correct: false }]);
    supabase.from("questions").select("*, question_options(*)").eq("subject_id", selectedSubject).order("created_at", { ascending: false }).then(({ data }) => setQuestions(data ?? []));
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast.success("Questão removida");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><HelpCircle className="w-6 h-6" /> Banco de Questões</h1>

      <div className="flex gap-3 flex-wrap">
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-60"><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
          <SelectContent>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedSubject && <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nova Questão</Button>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Nova Questão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Enunciado</Label><Textarea value={statement} onChange={e => setStatement(e.target.value)} rows={3} /></div>
            <div><Label>Dificuldade</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="font-mono text-primary w-6">{o.label})</span>
                <Input value={o.text} onChange={e => { const n = [...opts]; n[i].text = e.target.value; setOpts(n); }} placeholder={`Alternativa ${o.label}`} className="flex-1" />
                <input type="radio" name="correct" checked={o.is_correct} onChange={() => setOpts(opts.map((x, j) => ({ ...x, is_correct: j === i })))} />
              </div>
            ))}
            <div><Label>Explicação</Label><Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} /></div>
            <Button onClick={addQuestion} className="w-full gradient-primary text-primary-foreground">Salvar Questão</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {questions.map(q => (
          <Card key={q.id} className="glass-card">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{q.statement}</p>
                <div className="mt-2 space-y-1">
                  {q.question_options?.map((o: any) => (
                    <p key={o.id} className={`text-xs ${o.is_correct ? "text-green-400" : "text-muted-foreground"}`}>
                      {o.label}) {o.text} {o.is_correct && "✓"}
                    </p>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
        {selectedSubject && questions.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma questão nesta matéria.</p>}
      </div>
    </div>
  );
}
