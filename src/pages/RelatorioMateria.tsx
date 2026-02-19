/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, Area, AreaChart
} from "recharts";
import {
    BarChart3, TrendingUp, TrendingDown, Target, BookOpen,
    ChevronRight, Loader2, Award, Flame, AlertTriangle, CheckCircle
} from "lucide-react";

interface SubjectReport {
    id: string;
    name: string;
    total: number;
    correct: number;
    accuracy: number;
    trend: "up" | "down" | "stable";
    recentAccuracy: number;
    weeklyData: { week: string; accuracy: number; total: number }[];
}

const CHART_COLORS = [
    "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)", "hsl(152, 69%, 42%)",
    "hsl(280, 70%, 55%)", "hsl(25, 95%, 53%)", "hsl(195, 85%, 48%)",
];

export default function RelatorioMateria() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<SubjectReport[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectReport | null>(null);
    const [globalStats, setGlobalStats] = useState({ totalQuestions: 0, avgAccuracy: 0, bestSubject: "", worstSubject: "" });

    useEffect(() => {
        if (!user) return;
        loadReports();
    }, [user]);

    const loadReports = async () => {
        if (!user) return;
        setLoading(true);

        const [answersRes, subjectsRes] = await Promise.all([
            supabase.from("user_answers").select("question_id, is_correct, answered_at").eq("user_id", user.id).order("answered_at"),
            supabase.from("subjects").select("id, name"),
        ]);

        const answers = answersRes.data ?? [];
        const subjects = subjectsRes.data ?? [];

        if (answers.length === 0) {
            setLoading(false);
            return;
        }

        // Get question -> subject mapping
        const questionIds = [...new Set(answers.map(a => a.question_id))];
        const { data: questions } = await supabase
            .from("questions")
            .select("id, subject_id")
            .in("id", questionIds);

        const qSubjectMap: Record<string, string> = {};
        questions?.forEach(q => { qSubjectMap[q.id] = q.subject_id; });

        const subjectNameMap: Record<string, string> = {};
        subjects.forEach(s => { subjectNameMap[s.id] = s.name; });

        // Build per-subject data with time series
        const subjectData: Record<string, { total: number; correct: number; answers: { date: string; correct: boolean }[] }> = {};

        answers.forEach(a => {
            const sid = qSubjectMap[a.question_id];
            if (!sid) return;
            if (!subjectData[sid]) subjectData[sid] = { total: 0, correct: 0, answers: [] };
            subjectData[sid].total++;
            if (a.is_correct) subjectData[sid].correct++;
            subjectData[sid].answers.push({
                date: a.answered_at,
                correct: a.is_correct,
            });
        });

        // Build reports with weekly trends
        const reportsList: SubjectReport[] = Object.entries(subjectData).map(([sid, data]) => {
            const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

            // Calculate weekly data
            const weeklyMap: Record<string, { correct: number; total: number }> = {};
            data.answers.forEach(a => {
                const d = new Date(a.date);
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                const key = weekStart.toISOString().slice(0, 10);
                if (!weeklyMap[key]) weeklyMap[key] = { correct: 0, total: 0 };
                weeklyMap[key].total++;
                if (a.correct) weeklyMap[key].correct++;
            });

            const weeklyData = Object.entries(weeklyMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-8) // Last 8 weeks
                .map(([week, d]) => ({
                    week: new Date(week).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                    accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
                    total: d.total,
                }));

            // Recent accuracy (last 20 answers)
            const recent = data.answers.slice(-20);
            const recentCorrect = recent.filter(a => a.correct).length;
            const recentAccuracy = recent.length > 0 ? Math.round((recentCorrect / recent.length) * 100) : 0;

            const trend: "up" | "down" | "stable" = recentAccuracy > accuracy + 5 ? "up" : recentAccuracy < accuracy - 5 ? "down" : "stable";

            return {
                id: sid,
                name: subjectNameMap[sid] || "Desconhecida",
                total: data.total,
                correct: data.correct,
                accuracy,
                trend,
                recentAccuracy,
                weeklyData,
            };
        }).sort((a, b) => b.total - a.total);

        setReports(reportsList);

        // Global stats
        const totalQ = reportsList.reduce((s, r) => s + r.total, 0);
        const avgAcc = reportsList.length > 0 ? Math.round(reportsList.reduce((s, r) => s + r.accuracy, 0) / reportsList.length) : 0;
        const sorted = [...reportsList].sort((a, b) => b.accuracy - a.accuracy);

        setGlobalStats({
            totalQuestions: totalQ,
            avgAccuracy: avgAcc,
            bestSubject: sorted[0]?.name || "-",
            worstSubject: sorted[sorted.length - 1]?.name || "-",
        });

        setLoading(false);
    };

    const tooltipStyle = {
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        color: "hsl(var(--foreground))",
        fontSize: "12px",
    };

    // ─── Detail View ───
    if (selectedSubject) {
        const r = selectedSubject;
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>← Voltar</Button>
                    <h1 className="font-heading text-2xl font-bold">{r.name}</h1>
                    <Badge variant="outline" className={r.trend === "up" ? "text-green-500 border-green-500/30" : r.trend === "down" ? "text-red-500 border-red-500/30" : "text-muted-foreground"}>
                        {r.trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : r.trend === "down" ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                        {r.trend === "up" ? "Melhorando" : r.trend === "down" ? "Caindo" : "Estável"}
                    </Badge>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="glass-card">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-heading font-bold font-mono text-primary">{r.accuracy}%</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acerto Geral</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card">
                        <CardContent className="p-4 text-center">
                            <p className={`text-3xl font-heading font-bold font-mono ${r.recentAccuracy >= r.accuracy ? "text-green-500" : "text-red-500"}`}>{r.recentAccuracy}%</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acerto Recente</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-heading font-bold font-mono">{r.total}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Questões</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-heading font-bold font-mono text-red-500">{r.total - r.correct}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Erros</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Evolution Chart */}
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="font-heading text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" /> Evolução Semanal de Acerto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={r.weeklyData}>
                                <defs>
                                    <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(210, 100%, 52%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(210, 100%, 52%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="accuracy" stroke="hsl(210, 100%, 52%)" fill="url(#accuracyGrad)" strokeWidth={2} name="Acerto %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Volume Chart */}
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="font-heading text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-accent" /> Questões por Semana
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={r.weeklyData}>
                                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="total" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Questões" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* AI Suggestion */}
                <Card className="glass-card border-primary/20">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-heading font-bold text-sm mb-1">Sugestão</p>
                            <p className="text-sm text-muted-foreground">
                                {r.accuracy < 50
                                    ? `Sua taxa de acerto em ${r.name} está abaixo de 50%. Recomendamos focar nas aulas teóricas antes de resolver mais questões.`
                                    : r.trend === "down"
                                        ? `Seu desempenho em ${r.name} está caindo. Revise os erros recentes no Caderno de Erros e pratique questões dessa matéria.`
                                        : r.trend === "up"
                                            ? `Parabéns! Você está melhorando em ${r.name}. Continue praticando para consolidar o conhecimento.`
                                            : `Seu desempenho em ${r.name} está estável em ${r.accuracy}%. Para subir, foque nos tópicos que mais erra.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Main View ───
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" /> Relatório por Matéria
                </h1>
                <p className="text-muted-foreground text-sm">Analise seu desempenho detalhado em cada disciplina</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : reports.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                            <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="font-heading font-bold text-xl">Sem dados ainda</h2>
                        <p className="text-muted-foreground text-sm">Resolva questões para ver seu relatório por matéria aqui.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{globalStats.totalQuestions}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Questões</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <Award className="w-5 h-5 text-accent mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{globalStats.avgAccuracy}%</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Média Geral</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono truncate">{globalStats.bestSubject}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Melhor Matéria</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono truncate">{globalStats.worstSubject}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pior Matéria</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Overview Chart */}
                    <Card className="glass-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="font-heading text-base flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-accent" /> Comparativo de Matérias
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={Math.max(200, reports.length * 45)}>
                                <BarChart data={reports} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="accuracy" fill="hsl(210, 100%, 52%)" radius={[0, 6, 6, 0]} name="Acerto %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Subject Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((r, idx) => (
                            <Card
                                key={r.id}
                                className="glass-card-hover cursor-pointer"
                                onClick={() => setSelectedSubject(r)}
                            >
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-heading font-bold text-sm truncate">{r.name}</h3>
                                        <Badge variant="outline" className={`text-[10px] ${r.trend === "up" ? "text-green-500 border-green-500/30" :
                                            r.trend === "down" ? "text-red-500 border-red-500/30" :
                                                "text-muted-foreground"
                                            }`}>
                                            {r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : "→"} {r.recentAccuracy}%
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Acerto</span>
                                            <span className="font-mono font-bold" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }}>{r.accuracy}%</span>
                                        </div>
                                        <Progress value={r.accuracy} className="h-2" />
                                    </div>

                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{r.total} questões</span>
                                        <span className="text-red-400">{r.total - r.correct} erros</span>
                                    </div>

                                    {/* Mini sparkline */}
                                    {r.weeklyData.length > 1 && (
                                        <ResponsiveContainer width="100%" height={40}>
                                            <LineChart data={r.weeklyData}>
                                                <Line
                                                    type="monotone"
                                                    dataKey="accuracy"
                                                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}

                                    <Button variant="ghost" size="sm" className="w-full text-xs text-primary">
                                        Ver Detalhes <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
