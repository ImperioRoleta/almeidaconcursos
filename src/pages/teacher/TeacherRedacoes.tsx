import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, CheckCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function TeacherRedacoes() {
  const navigate = useNavigate();
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchEssays();
  }, []);

  async function fetchEssays() {
    setLoading(true);
    try {
      // Fetch essays first
      const { data: essaysData, error: essaysError } = await supabase
        .from("essays")
        .select("id, title, status, score, created_at, corrected_at, user_id")
        .order("created_at", { ascending: false });

      if (essaysError) throw essaysError;

      // Extract user IDs to fetch profiles
      const userIds = Array.from(new Set(essaysData?.map(e => e.user_id).filter(Boolean)));

      // Fetch profiles manually since relation might be missing
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Create a map for quick access
      const profilesMap = new Map();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p));

      // Merge data
      const merged = essaysData?.map(essay => ({
        ...essay,
        profiles: profilesMap.get(essay.user_id) || { name: "Usuário Desconhecido" }
      }));

      setEssays(merged || []);
    } catch (error) {
      console.error("Error fetching essays:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEssays = essays.filter(essay => {
    const studentName = (essay.profiles as any)?.name?.toLowerCase() || "";
    const title = essay.title?.toLowerCase() || "";
    const q = search.toLowerCase();
    return studentName.includes(q) || title.includes(q);
  });

  const pendingEssays = filteredEssays.filter(e => e.status === "submitted");
  const correctedEssays = filteredEssays.filter(e => e.status === "corrected");

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Mural de Correções
          </h1>
          <p className="text-muted-foreground">Gerencie e avalie as redações dos alunos.</p>
        </div>
        <div className="w-full md:w-64">
          <Input
            placeholder="Buscar aluno ou tema..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-card"
          />
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="w-2 h-8 bg-yellow-500 rounded-full" />
            Pendentes ({pendingEssays.length})
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingEssays.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed">
                Nenhuma redação pendente! 🎉
              </div>
            ) : (
              pendingEssays.map(essay => (
                <Card key={essay.id} className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md" onClick={() => navigate(`/teacher/redacoes/${essay.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Aguardando
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(essay.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                      {essay.title || "Sem título"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {((essay.profiles as any)?.name || "A").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{(essay.profiles as any)?.name || "Aluno Desconhecido"}</p>
                        <p className="text-xs">{(essay.profiles as any)?.email}</p>
                      </div>
                    </div>
                    <Button className="w-full mt-4 gap-2" size="sm">
                      Corrigir Agora <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        <section className="pt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="w-2 h-8 bg-green-500 rounded-full" />
            Corrigidas Recentemente
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
            {correctedEssays.length === 0 ? (
              <div className="col-span-full py-6 text-center text-muted-foreground text-sm">
                Nenhuma redação corrigida ainda.
              </div>
            ) : (
              correctedEssays.slice(0, 6).map(essay => (
                <Card key={essay.id} className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                        <CheckCircle className="w-3 h-3" /> Nota: {essay.score}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {essay.corrected_at && format(new Date(essay.corrected_at), "dd/MM")}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-1 text-base">
                      {essay.title || "Sem título"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {(essay.profiles as any)?.name}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
