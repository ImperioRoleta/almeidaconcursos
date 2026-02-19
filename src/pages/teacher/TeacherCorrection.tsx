import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ArrowLeft, User, Calendar, CheckCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TeacherCorrection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (id) fetchEssay(id);
  }, [id]);

  async function fetchEssay(essayId: string) {
    setLoading(true);
    try {
      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .select("id, title, content, status, score, correction, corrected_at, created_at, user_id")
        .eq("id", essayId)
        .single();

      if (essayError) throw essayError;

      // Manually fetch profile
      let profileData = { name: "Usuário Desconhecido" };
      if (essayData.user_id) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", essayData.user_id)
          .single();
        if (pData) profileData = pData;
      }

      const fullData = { ...essayData, profiles: profileData };
      setEssay(fullData);

      if (fullData.status === "corrected") {
        setScore(fullData.score?.toString() || "");
        if (typeof fullData.correction === "object" && !Array.isArray(fullData.correction) && fullData.correction?.general_comments) {
          setComments(String(fullData.correction.general_comments));
        } else if (typeof fullData.correction === "string") {
          setComments(fullData.correction);
        }
      }
    } catch (error) {
      console.error("Error fetching essay:", error);
      toast.error("Erro ao carregar redação.");
      navigate("/teacher/redacoes");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    if (!score || !comments) {
      toast.error("Por favor, preencha a nota e os comentários.");
      return;
    }

    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 1000) {
      toast.error("Nota inválida. Use um valor entre 0 e 1000.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let teacherName = "Professor";
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
        if (profile?.name) teacherName = profile.name;
      }

      const correctionData = {
        general_comments: comments,
        corrected_by: "teacher",
        teacher_name: teacherName,
        feedback_date: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("essays")
        .update({
          status: "corrected",
          score: numericScore,
          correction: correctionData,
          corrected_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Correção enviada com sucesso!");
      navigate("/teacher/redacoes");
    } catch (error) {
      console.error("Error submitting correction:", error);
      toast.error("Erro ao enviar correção.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!essay) return null;

  return (
    <div className="container mx-auto p-6 space-y-6 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/redacoes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Corrigindo Redação
            {essay.status === "corrected" && <CheckCircle className="w-5 h-5 text-green-500" />}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {(essay.profiles as any)?.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {format(new Date(essay.created_at), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Essay View */}
        <Card className="flex flex-col overflow-hidden border-primary/20 shadow-lg">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg">Texto do Aluno</CardTitle>
            <CardDescription className="font-semibold text-foreground">
              Tema: {essay.title || "Livre"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto p-6 text-lg leading-relaxed font-serif bg-card/50" style={{ maxHeight: "60vh" }}>
            <div className="whitespace-pre-wrap">{essay.content}</div>
          </CardContent>
        </Card>

        {/* Correction Form */}
        <Card className="flex flex-col border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              Avaliação do Professor
              <GraduationCap className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-6 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="score" className="text-base font-bold">Nota Final (0-1000)</Label>
              <Input
                id="score"
                type="number"
                placeholder="Ex: 840"
                value={score}
                onChange={e => setScore(e.target.value)}
                className="text-2xl font-bold h-14 border-primary/30"
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="comments" className="text-base font-bold">Comentários & Feedback</Label>
              <Textarea
                id="comments"
                placeholder="Escreva sua análise detalhada aqui..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="min-h-[200px] resize-none text-base p-4 border-primary/20 focus-visible:ring-primary"
              />
            </div>

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full text-xl font-bold h-14 shadow-lg"
            >
              {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
              {essay.status === "corrected" ? "Atualizar Correção" : "Finalizar Correção"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
