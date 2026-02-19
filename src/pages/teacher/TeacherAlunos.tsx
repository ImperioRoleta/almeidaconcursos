import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Shield, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StudentData {
    user_id: string;
    name: string;
    // email: string; // Not available in profiles
    created_at: string;
    essayCount?: number;
    progressCount?: number;
    subscription?: { plan: string; status: string } | null;
}

export default function TeacherAlunos() {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchStudents();
    }, []);

    async function fetchStudents() {
        setLoading(true);
        try {
            // Fetch all profiles with email
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("user_id, name, created_at")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Enrich with essay count, avg score + subscription
            const enriched = await Promise.all(
                ((profiles as any[]) || []).map(async (p) => {
                    const [essaysRes, progressRes, subRes] = await Promise.all([
                        supabase.from("essays").select("score"),
                        supabase.from("user_progress").select("id", { count: "exact", head: true }).eq("user_id", p.user_id).eq("completed", true),
                        supabase.from("subscriptions").select("plan, status").eq("user_id", p.user_id).maybeSingle(),
                    ]);

                    const essays = essaysRes.data || [];
                    const essayCount = essays.length;
                    const validScores = essays.filter(e => e.score !== null).map(e => e.score as number);
                    const avgScore = validScores.length > 0
                        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                        : 0;

                    return {
                        ...p,
                        essayCount,
                        avgEssayScore: avgScore,
                        progressCount: progressRes.count ?? 0,
                        subscription: subRes.data ?? null,
                    };
                })
            );

            setStudents(enriched);
        } catch (err) {
            console.error("Error fetching students:", err);
            // toast.error("Erro ao carregar alunos");
        } finally {
            setLoading(false);
        }
    }

    const filtered = students.filter(s => {
        const q = search.toLowerCase();
        return s.name?.toLowerCase().includes(q);
    });

    const getPlanBadge = (sub: StudentData["subscription"]) => {
        if (!sub || sub.status !== "active") return <Badge variant="outline" className="text-xs">Gratuito</Badge>;
        if (sub.plan === "premium_anual") return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Anual</Badge>;
        if (sub.plan === "premium_mensal") return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">Mensal</Badge>;
        if (sub.plan === "premium_teste") return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">Trial</Badge>;
        return <Badge variant="outline" className="text-xs">Gratuito</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Meus Alunos
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {filtered.length} aluno{filtered.length !== 1 ? "s" : ""} cadastrado{filtered.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="w-full md:w-72">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar aluno..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 bg-card"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin w-8 h-8 text-primary" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(student => (
                        <Card key={student.user_id} className="hover:border-primary/30 transition-all shadow-sm hover:shadow-md group flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 group-hover:scale-105 transition-transform">
                                        {(student.name || "A").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">{student.name || "Sem nome"}</CardTitle>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                            <User className="w-3 h-3" />
                                            <span className="truncate">Aluno</span>
                                        </div>
                                    </div>
                                    {getPlanBadge(student.subscription)}
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3 mt-auto">
                                <div className="bg-muted/30 rounded-lg p-3 text-center">
                                    <BookOpen className="w-4 h-4 text-primary mx-auto mb-1" />
                                    <p className="text-2xl font-bold text-primary">{student.progressCount}</p>
                                    <p className="text-[10px] text-muted-foreground">Aulas</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 text-center">
                                    <Shield className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                                    <div className="flex items-center justify-center gap-1">
                                        <p className="text-2xl font-bold text-amber-500">{student.essayCount}</p>
                                        {(student as any).avgEssayScore > 0 && (
                                            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1 rounded">
                                                ★ {(student as any).avgEssayScore}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Redações</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filtered.length === 0 && !loading && (
                        <div className="col-span-full py-16 text-center text-muted-foreground">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum aluno encontrado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
