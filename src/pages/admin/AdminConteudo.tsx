import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Edit } from "lucide-react";

export default function AdminConteudo() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"subject" | "topic" | "lesson">("subject");

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    supabase.from("topics").select("*").eq("subject_id", selectedSubject).order("order_index").then(({ data }) => setTopics(data ?? []));
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedTopic) return;
    supabase.from("lessons").select("*").eq("topic_id", selectedTopic).order("order_index").then(({ data }) => setLessons(data ?? []));
  }, [selectedTopic]);

  const addSubject = async () => {
    if (!newName.trim()) return;
    await supabase.from("subjects").insert({ name: newName, description: newDesc });
    toast.success("Matéria criada");
    setNewName(""); setNewDesc(""); setDialogOpen(false);
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  };

  const addTopic = async () => {
    if (!newName.trim() || !selectedSubject) return;
    await supabase.from("topics").insert({ name: newName, subject_id: selectedSubject, description: newDesc });
    toast.success("Assunto criado");
    setNewName(""); setNewDesc(""); setDialogOpen(false);
    supabase.from("topics").select("*").eq("subject_id", selectedSubject).order("order_index").then(({ data }) => setTopics(data ?? []));
  };

  const addLesson = async () => {
    if (!newName.trim() || !selectedTopic) return;
    setUploading(true);
    let videoUrl = newVideoUrl.trim();

    // Handle video file upload
    if (videoFile) {
      const ext = videoFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("lesson-videos").upload(path, videoFile);
      if (uploadErr) {
        toast.error("Erro ao enviar vídeo: " + uploadErr.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("lesson-videos").getPublicUrl(path);
      videoUrl = urlData.publicUrl;
    }

    await supabase.from("lessons").insert({
      title: newName,
      content: newContent,
      topic_id: selectedTopic,
      video_url: videoUrl || null,
    } as any);
    toast.success("Aula criada");
    setNewName(""); setNewContent(""); setNewVideoUrl(""); setVideoFile(null); setDialogOpen(false);
    setUploading(false);
    supabase.from("lessons").select("*").eq("topic_id", selectedTopic).order("order_index").then(({ data }) => setLessons(data ?? []));
  };

  const deleteItem = async (table: "subjects" | "topics" | "lessons", id: string) => {
    await supabase.from(table).delete().eq("id", id);
    toast.success("Removido");
    if (table === "subjects") supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
    if (table === "topics") supabase.from("topics").select("*").eq("subject_id", selectedSubject!).order("order_index").then(({ data }) => setTopics(data ?? []));
    if (table === "lessons") supabase.from("lessons").select("*").eq("topic_id", selectedTopic!).order("order_index").then(({ data }) => setLessons(data ?? []));
  };

  const openAdd = (mode: "subject" | "topic" | "lesson") => {
    setEditMode(mode);
    setNewName(""); setNewDesc(""); setNewContent(""); setNewVideoUrl(""); setVideoFile(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editMode === "subject") addSubject();
    else if (editMode === "topic") addTopic();
    else addLesson();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Gestão de Conteúdo</h1>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">Adicionar {editMode === "subject" ? "Matéria" : editMode === "topic" ? "Assunto" : "Aula"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{editMode === "lesson" ? "Título" : "Nome"}</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
            {editMode !== "lesson" && <div><Label>Descrição</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>}
            {editMode === "lesson" && <div><Label>Conteúdo (Markdown)</Label><Textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={8} /></div>}
            {editMode === "lesson" && (
              <div className="space-y-3 border-t border-border pt-3">
                <Label className="text-sm font-semibold">Vídeo da Aula (opcional)</Label>
                <Input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="URL do YouTube, Vimeo ou link direto" />
                <p className="text-xs text-muted-foreground">Ou faça upload de um arquivo de vídeo:</p>
                <Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              </div>
            )}
            <Button onClick={handleSave} disabled={uploading} className="w-full gradient-primary text-primary-foreground">
              {uploading ? "Enviando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!selectedSubject && (
        <>
          <Button onClick={() => openAdd("subject")} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Matéria</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map(s => (
              <Card key={s.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => { setSelectedSubject(s.id); setSelectedTopic(null); }}>
                    <p className="font-heading font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem("subjects", s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedSubject && !selectedTopic && (
        <>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedSubject(null)}>← Matérias</Button>
            <Button onClick={() => openAdd("topic")} size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Assunto</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(t => (
              <Card key={t.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedTopic(t.id)}>
                    <p className="font-heading font-semibold">{t.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem("topics", t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedTopic && (
        <>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedTopic(null)}>← Assuntos</Button>
            <Button onClick={() => openAdd("lesson")} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Aula</Button>
          </div>
          <div className="space-y-3">
            {lessons.map(l => (
              <Card key={l.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{l.title}</p>
                    {(l as any).video_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">VÍDEO</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem("lessons", l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
