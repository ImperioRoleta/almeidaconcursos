import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Edit, Image, ArrowLeft } from "lucide-react";

type EditMode = "subject" | "topic" | "lesson";

export default function AdminConteudo() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("subject");
  const [editingId, setEditingId] = useState<string | null>(null); // null = creating new

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) loadTopics();
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTopic) loadLessons();
  }, [selectedTopic]);

  const loadSubjects = () => supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  const loadTopics = () => supabase.from("topics").select("*").eq("subject_id", selectedSubject!).order("order_index").then(({ data }) => setTopics(data ?? []));
  const loadLessons = () => supabase.from("lessons").select("*").eq("topic_id", selectedTopic!).order("order_index").then(({ data }) => setLessons(data ?? []));

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormContent(""); setFormVideoUrl(""); setFormImageUrl(""); setVideoFile(null); setEditingId(null);
  };

  const openCreate = (mode: EditMode) => {
    setEditMode(mode);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (mode: EditMode, item: any) => {
    setEditMode(mode);
    setEditingId(item.id);
    if (mode === "lesson") {
      setFormName(item.title || "");
      setFormContent(item.content || "");
      setFormVideoUrl(item.video_url || "");
      setFormImageUrl(item.image_url || "");
    } else {
      setFormName(item.name || "");
      setFormDesc(item.description || "");
      setFormImageUrl(item.image_url || "");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setUploading(true);

    try {
      if (editMode === "subject") {
        const payload = { name: formName, description: formDesc, image_url: formImageUrl || null };
        if (editingId) {
          await supabase.from("subjects").update(payload).eq("id", editingId);
          toast.success("Matéria atualizada");
        } else {
          await supabase.from("subjects").insert(payload);
          toast.success("Matéria criada");
        }
        loadSubjects();
      } else if (editMode === "topic") {
        const payload = { name: formName, description: formDesc, image_url: formImageUrl || null, subject_id: selectedSubject! };
        if (editingId) {
          const { subject_id, ...updatePayload } = payload;
          await supabase.from("topics").update(updatePayload).eq("id", editingId);
          toast.success("Assunto atualizado");
        } else {
          await supabase.from("topics").insert(payload);
          toast.success("Assunto criado");
        }
        loadTopics();
      } else {
        let videoUrl = formVideoUrl.trim();
        if (videoFile) {
          const ext = videoFile.name.split(".").pop();
          const path = `${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("lesson-videos").upload(path, videoFile);
          if (uploadErr) { toast.error("Erro ao enviar vídeo: " + uploadErr.message); setUploading(false); return; }
          const { data: urlData } = supabase.storage.from("lesson-videos").getPublicUrl(path);
          videoUrl = urlData.publicUrl;
        }
        const payload = { title: formName, content: formContent, video_url: videoUrl || null, image_url: formImageUrl || null, topic_id: selectedTopic! };
        if (editingId) {
          const { topic_id, ...updatePayload } = payload;
          await supabase.from("lessons").update(updatePayload as any).eq("id", editingId);
          toast.success("Aula atualizada");
        } else {
          await supabase.from("lessons").insert(payload as any);
          toast.success("Aula criada");
        }
        loadLessons();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }

    setUploading(false);
    setDialogOpen(false);
    resetForm();
  };

  const deleteItem = async (table: "subjects" | "topics" | "lessons", id: string) => {
    if (!confirm("Tem certeza que deseja remover?")) return;
    await supabase.from(table).delete().eq("id", id);
    toast.success("Removido");
    if (table === "subjects") loadSubjects();
    if (table === "topics") loadTopics();
    if (table === "lessons") loadLessons();
  };

  const dialogTitle = editingId
    ? `Editar ${editMode === "subject" ? "Matéria" : editMode === "topic" ? "Assunto" : "Aula"}`
    : `Adicionar ${editMode === "subject" ? "Matéria" : editMode === "topic" ? "Assunto" : "Aula"}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Gestão de Conteúdo</h1>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{editMode === "lesson" ? "Título" : "Nome"}</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            {editMode !== "lesson" && (
              <div><Label>Descrição</Label><Input value={formDesc} onChange={e => setFormDesc(e.target.value)} /></div>
            )}
            {editMode === "lesson" && (
              <div><Label>Conteúdo (Markdown)</Label><Textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={8} /></div>
            )}
            {/* Image URL - available for all */}
            <div>
              <Label className="flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Imagem (URL, opcional)</Label>
              <Input value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
            </div>
            {editMode === "lesson" && (
              <div className="space-y-3 border-t border-border pt-3">
                <Label className="text-sm font-semibold">Vídeo da Aula (opcional)</Label>
                <Input value={formVideoUrl} onChange={e => setFormVideoUrl(e.target.value)} placeholder="URL do YouTube, Vimeo ou link direto" />
                <p className="text-xs text-muted-foreground">Ou faça upload de um arquivo de vídeo:</p>
                <Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              </div>
            )}
            <Button onClick={handleSave} disabled={uploading} className="w-full gradient-primary text-primary-foreground">
              {uploading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subjects list */}
      {!selectedSubject && (
        <>
          <Button onClick={() => openCreate("subject")} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Matéria</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map(s => (
              <Card key={s.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => { setSelectedSubject(s.id); setSelectedTopic(null); }}>
                    {s.image_url && <img src={s.image_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
                    <p className="font-heading font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit("subject", s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem("subjects", s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Topics list */}
      {selectedSubject && !selectedTopic && (
        <>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedSubject(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Matérias</Button>
            <Button onClick={() => openCreate("topic")} size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Assunto</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(t => (
              <Card key={t.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => setSelectedTopic(t.id)}>
                    {t.image_url && <img src={t.image_url} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />}
                    <p className="font-heading font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit("topic", t)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem("topics", t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Lessons list */}
      {selectedTopic && (
        <>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelectedTopic(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Assuntos</Button>
            <Button onClick={() => openCreate("lesson")} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Aula</Button>
          </div>
          <div className="space-y-3">
            {lessons.map((l, idx) => (
              <Card key={l.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {l.image_url && <img src={l.image_url} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium">Aula {String(idx + 1).padStart(2, "0")} — {l.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {l.video_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">VÍDEO</span>}
                        {l.image_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">IMAGEM</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit("lesson", l)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem("lessons", l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {lessons.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma aula neste assunto.</p>}
          </div>
        </>
      )}
    </div>
  );
}
