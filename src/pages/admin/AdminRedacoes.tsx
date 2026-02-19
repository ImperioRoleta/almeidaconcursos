/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PenLine, Plus, Trash2, Edit, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function AdminRedacoes() {
    const [themes, setThemes] = useState<any[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [activeDate, setActiveDate] = useState("");
    const [motivatingText1, setMotivatingText1] = useState("");
    const [motivatingText2, setMotivatingText2] = useState("");
    const [motivatingText3, setMotivatingText3] = useState("");

    useEffect(() => {
        loadThemes();
    }, []);

    const loadThemes = async () => {
        const { data } = await supabase.from("essay_themes").select("*").order("active_date", { ascending: false });
        setThemes(data || []);
    };

    const openDialog = (theme?: any) => {
        if (theme) {
            setEditingId(theme.id);
            setTitle(theme.title);
            setDescription(theme.description);
            setActiveDate(theme.active_date || "");
            const texts = theme.motivating_texts || [];
            setMotivatingText1(typeof texts[0] === 'string' ? texts[0] : texts[0]?.text || "");
            setMotivatingText2(typeof texts[1] === 'string' ? texts[1] : texts[1]?.text || "");
            setMotivatingText3(typeof texts[2] === 'string' ? texts[2] : texts[2]?.text || "");
        } else {
            setEditingId(null);
            setTitle("");
            setDescription("");
            setActiveDate(new Date().toISOString().split("T")[0]);
            setMotivatingText1("");
            setMotivatingText2("");
            setMotivatingText3("");
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!title || !description) return toast.error("Preencha título e descrição");

        const motivating_texts = [motivatingText1, motivatingText2, motivatingText3].filter(t => t.trim());

        const payload = {
            title,
            description,
            active_date: activeDate || null,
            motivating_texts,
            genre: "dissertativo-argumentativo",
            created_by: "admin"
        };

        if (editingId) {
            await supabase.from("essay_themes").update(payload).eq("id", editingId);
            toast.success("Tema atualizado");
        } else {
            await supabase.from("essay_themes").insert(payload);
            toast.success("Tema criado");
        }

        setDialogOpen(false);
        loadThemes();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza?")) return;
        await supabase.from("essay_themes").delete().eq("id", id);
        toast.success("Deletado");
        loadThemes();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
                    <PenLine className="w-6 h-6" /> Gestão de Redações
                </h1>
                <Button onClick={() => openDialog()} className="gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" /> Novo Tema
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map(theme => (
                    <Card key={theme.id} className="glass-card">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                                    {theme.active_date ? format(new Date(theme.active_date), 'dd/MM/yyyy') : 'Sem data'}
                                </span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openDialog(theme)}><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(theme.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                            </div>
                            <div>
                                <p className="font-heading font-semibold line-clamp-1">{theme.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{theme.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingId ? "Editar Tema" : "Novo Tema"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Título</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: A importância da tecnologia..." />
                        </div>
                        <div>
                            <Label>Data de Ativação (Tema do Dia)</Label>
                            <Input type="date" value={activeDate ? activeDate.split("T")[0] : ""} onChange={e => setActiveDate(e.target.value)} />
                            <p className="text-xs text-muted-foreground mt-1">Se definido, aparecerá como "Tema do Dia" nesta data.</p>
                        </div>
                        <div>
                            <Label>Descrição / Instruções</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <Label>Textos Motivadores (Opcional)</Label>
                            <Textarea value={motivatingText1} onChange={e => setMotivatingText1(e.target.value)} placeholder="Texto 1..." rows={2} />
                            <Textarea value={motivatingText2} onChange={e => setMotivatingText2(e.target.value)} placeholder="Texto 2..." rows={2} />
                            <Textarea value={motivatingText3} onChange={e => setMotivatingText3(e.target.value)} placeholder="Texto 3..." rows={2} />
                        </div>
                        <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">Salvar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
