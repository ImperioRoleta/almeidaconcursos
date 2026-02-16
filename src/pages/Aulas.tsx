import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

export default function Aulas() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    supabase.from("topics").select("*").eq("subject_id", selectedSubject).order("order_index").then(({ data }) => {
      setTopics(data ?? []);
      setSelectedTopic(null);
      setSelectedLesson(null);
    });
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedTopic) return;
    supabase.from("lessons").select("*").eq("topic_id", selectedTopic).order("order_index").then(({ data }) => {
      setLessons(data ?? []);
      setSelectedLesson(null);
    });
  }, [selectedTopic]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true).then(({ data }) => {
      setCompletedIds(new Set(data?.map(p => p.lesson_id!).filter(Boolean) ?? []));
    });
  }, [user]);

  const markComplete = async (lessonId: string) => {
    if (!user) return;
    await supabase.from("user_progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
    setCompletedIds(prev => new Set(prev).add(lessonId));
  };

  if (selectedLesson) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Button variant="ghost" onClick={() => setSelectedLesson(null)} className="text-muted-foreground">← Voltar</Button>
        <h1 className="font-heading text-2xl font-bold">{selectedLesson.title}</h1>
        <div className="prose prose-invert prose-lg max-w-none glass-card p-8 leading-relaxed
          prose-headings:font-heading prose-headings:text-foreground prose-headings:font-bold
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:text-muted-foreground prose-p:mb-4 prose-p:leading-relaxed
          prose-strong:text-foreground prose-strong:font-semibold
          prose-li:text-muted-foreground prose-li:mb-1
          prose-ul:mb-4 prose-ol:mb-4
          prose-a:text-primary prose-a:underline">
          {selectedLesson.content ? (
            <ReactMarkdown>{selectedLesson.content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Conteúdo da aula será adicionado em breve.</p>
          )}
        </div>
        {!completedIds.has(selectedLesson.id) && (
          <Button onClick={() => markComplete(selectedLesson.id)} className="gradient-primary text-primary-foreground">
            <CheckCircle className="w-4 h-4 mr-2" /> Marcar como concluída
          </Button>
        )}
        {completedIds.has(selectedLesson.id) && (
          <p className="text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Aula concluída</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold">Aulas</h1>
      <p className="text-muted-foreground">Navegue pelo conteúdo do edital SD PMBA</p>

      {!selectedSubject && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <Card key={s.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedSubject(s.id)}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-heading font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSubject && !selectedTopic && (
        <>
          <Button variant="ghost" onClick={() => setSelectedSubject(null)} className="text-muted-foreground">← Matérias</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(t => (
              <Card key={t.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedTopic(t.id)}>
                <CardContent className="p-6 flex items-center justify-between">
                  <p className="font-heading font-semibold">{t.name}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedTopic && (
        <>
          <Button variant="ghost" onClick={() => setSelectedTopic(null)} className="text-muted-foreground">← Assuntos</Button>
          <div className="space-y-3">
            {lessons.map(l => (
              <Card key={l.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedLesson(l)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {completedIds.has(l.id) ? <CheckCircle className="w-4 h-4 text-green-400" /> : <BookOpen className="w-4 h-4 text-muted-foreground" />}
                    <p className="font-medium">{l.title}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
            {lessons.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma aula disponível neste assunto.</p>}
          </div>
        </>
      )}
    </div>
  );
}
