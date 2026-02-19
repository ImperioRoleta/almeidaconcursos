import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle, Users, Loader2, TrendingUp, Clock, ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pendingEssays: 0,
        activeStudents: 0,
        correctedThisWeek: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // Pending Essays
                const { count: pendingCount } = await supabase
                    .from("essays")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "submitted");

                // Active Students (Simple count for now)
                const { count: studentsCount } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true });

                // Corrected this week
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

                const { count: correctedCount } = await supabase
                    .from("essays")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "corrected")
                    .gte("corrected_at", startOfWeek.toISOString());

                setStats({
                    pendingEssays: pendingCount || 0,
                    activeStudents: studentsCount || 0,
                    correctedThisWeek: correctedCount || 0
                });
            } catch (error) {
                console.error("Error fetching teacher stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando painel do mentor...</p>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="container mx-auto p-6 space-y-8 min-h-[80vh]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                        <GraduationCap className="h-10 w-10 text-primary" />
                        Portal do Professor
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Bem-vindo, <span className="font-semibold text-foreground">{user?.user_metadata?.name || "Mestre"}</span>. Hoje é um ótimo dia para ensinar.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => navigate("/teacher/redacoes")} className="shadow-lg shadow-primary/20">
                        Corrigir Redações <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-3"
            >
                <motion.div variants={item}>
                    <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5 shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Redações Pendentes</CardTitle>
                            <BookOpen className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-primary">{stats.pendingEssays}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Aguardando sua análise
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-blue-500/10 bg-gradient-to-br from-card to-blue-500/5 shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos na Plataforma</CardTitle>
                            <Users className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-blue-500">{stats.activeStudents}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Comunidade crescendo
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-green-500/10 bg-gradient-to-br from-card to-green-500/5 shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Correções na Semana</CardTitle>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-green-500">{stats.correctedThisWeek}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Impacto direto no aprendizado
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Quick Actions / Recent (Placeholder for now, can be expanded) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                        <CardDescription>Gerencie suas atividades de ensino</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/30" onClick={() => navigate("/teacher/redacoes")}>
                            <BookOpen className="h-6 w-6 text-primary" />
                            <span>Fila de Correção</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-blue-500/5 hover:border-blue-500/30">
                            <Users className="h-6 w-6 text-blue-500" />
                            <span>Buscar Aluno</span>
                        </Button>
                        {/* Add more shortcuts here */}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
