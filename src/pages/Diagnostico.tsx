import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Target, Clock, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function Diagnostico() {
  const { profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState("");
  const [focus, setFocus] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [generating, setGenerating] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.diagnostic_completed && profile?.diagnostic_data?.guide) {
      setGuide(profile.diagnostic_data.guide);
    }
  }, [profile]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-guide", {
        body: { level, focus, timeAvailable }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGuide(data.guide);
      toast.success("Plano de estudos gerado com sucesso!");

      // Force reload profile to update context if needed, purely visual here as we set local state

    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar guia.");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    try {
      const { error } = await supabase.from("profiles").update({
        diagnostic_completed: false,
        diagnostic_data: {}
      }).eq("user_id", profile.user_id);

      if (error) throw error;
      setGuide(null);
      setStep(1);
      toast.success("Diagnóstico resetado.");
    } catch (e) {
      toast.error("Erro ao resetar.");
    }
  };

  if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  if (guide) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Seu Plano de Guerra 🎖️</h1>
          <Button variant="outline" onClick={handleReset}><RefreshCw className="mr-2 h-4 w-4" /> Refazer Diagnóstico</Button>
        </div>
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none pt-6">
            <ReactMarkdown>{guide}</ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl min-h-[80vh] flex flex-col justify-center">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Diagnóstico Inicial</h1>
        <p className="text-muted-foreground">Vamos criar um plano totalmente personalizado para você.</p>
      </div>

      <Card className="border-2 border-primary/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 1 && <BookOpen className="h-6 w-6 text-primary" />}
            {step === 2 && <Target className="h-6 w-6 text-primary" />}
            {step === 3 && <Clock className="h-6 w-6 text-primary" />}

            {step === 1 && "Qual sua experiência atual?"}
            {step === 2 && "Qual seu foco principal?"}
            {step === 3 && "Disponibilidade diária?"}
          </CardTitle>
          <CardDescription>
            Passo {step} de 3
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 1 && (
            <>
              <Button size="lg" variant="outline" className="h-20 text-lg justify-start px-6 gap-4 hover:border-primary hover:bg-primary/5" onClick={() => { setLevel("Iniciante (Começando do zero)"); setStep(2); }}>
                🐣
                <div className="flex flex-col items-start">
                  <span className="font-bold">Começando do Zero</span>
                  <span className="text-sm text-muted-foreground font-normal">Nunca estudei ou sei muito pouco.</span>
                </div>
              </Button>
              <Button size="lg" variant="outline" className="h-20 text-lg justify-start px-6 gap-4 hover:border-primary hover:bg-primary/5" onClick={() => { setLevel("Avançado (Já tenho base)"); setStep(2); }}>
                🦅
                <div className="flex flex-col items-start">
                  <span className="font-bold">Já tenho base</span>
                  <span className="text-sm text-muted-foreground font-normal">Já estudo e quero refinar.</span>
                </div>
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              {["Carreiras Policiais", "Administrativas", "Tribunais", "Fiscal", "Geral / Outros"].map((f) => (
                <Button key={f} size="lg" variant="outline" className="justify-start text-lg h-14" onClick={() => { setFocus(f); setStep(3); }}>
                  {f}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
            </>
          )}

          {step === 3 && (
            <>
              {["1 a 2 horas", "2 a 4 horas", "4 horas ou mais"].map((t) => (
                <Button key={t} size="lg" variant="outline" className="justify-start text-lg h-14" onClick={() => { setTimeAvailable(t); handleGenerate(); }}>
                  {t}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
            </>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium animate-pulse">A Inteligência Artificial está montando seu plano...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
