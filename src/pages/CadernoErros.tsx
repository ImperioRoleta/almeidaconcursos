/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
    BookX, RefreshCcw, CheckCircle, XCircle, Filter,
    ChevronRight, ChevronDown, Loader2, Target, TrendingDown,
    Brain, Sparkles, BarChart3
} from "lucide-react";

interface WrongAnswer {
    id: string;
    question_id: string;
    answered_at: string;
    selected_option_id: string;
    question: {
        id: string;
        statement: string;
        explanation: string | null;
        subject_id: string;
        options: { id: string; label: string; text: string; is_correct: boolean }[];
    };
    subject_name: string;
}

interface SubjectGroup {
    subject_id: string;
    subject_name: string;
    errors: WrongAnswer[];
    total: number;
    retried: number;
}

export default function CadernoErros() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<SubjectGroup[]>([]);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [practicing, setPracticing] = useState(false);
    const [practiceQuestions, setPracticeQuestions] = useState<WrongAnswer[]>([]);
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [practiceStats, setPracticeStats] = useState({ correct: 0, total: 0 });
    const [filterSubject, setFilterSubject] = useState<string | null>(null);
    const [totalErrors, setTotalErrors] = useState(0);

    useEffect(() => {
        if (!user) return;
        loadErrors();
    }, [user]);

    const loadErrors = async () => {
        if (!user) return;
        setLoading(true);

        // Get all wrong answers
        const { data: wrongAnswers, error } = await supabase
            .from("user_answers")
            .select("id, question_id, answered_at, selected_option_id")
            .eq("user_id", user.id)
            .eq("is_correct", false)
            .order("answered_at", { ascending: false });

        if (error || !wrongAnswers) {
            setLoading(false);
            return;
        }

        // Get unique question IDs
        const questionIds = [...new Set(wrongAnswers.map(a => a.question_id))];
        if (questionIds.length === 0) {
            setGroups([]);
            setTotalErrors(0);
            setLoading(false);
            return;
        }

        // Fetch questions with options
        const { data: questions } = await supabase
            .from("questions")
            .select("id, statement, explanation, subject_id, options:question_options(id, label, text, is_correct)")
            .in("id", questionIds);

        // Fetch subjects
        const subjectIds = [...new Set(questions?.map(q => q.subject_id) || [])];
        const { data: subjects } = await supabase
            .from("subjects")
            .select("id, name")
            .in("id", subjectIds);

        const subjectMap: Record<string, string> = {};
        subjects?.forEach(s => { subjectMap[s.id] = s.name; });

        const questionMap: Record<string, any> = {};
        questions?.forEach(q => { questionMap[q.id] = q; });

        // Build wrong answers with full data - keep only latest error per question
        const seenQuestions = new Set<string>();
        const enriched: WrongAnswer[] = [];

        for (const wa of wrongAnswers) {
            if (seenQuestions.has(wa.question_id)) continue;
            seenQuestions.add(wa.question_id);

            const q = questionMap[wa.question_id];
            if (!q) continue;

            enriched.push({
                ...wa,
                question: q,
                subject_name: subjectMap[q.subject_id] || "Sem matéria",
            });
        }

        // Group by subject
        const groupMap: Record<string, SubjectGroup> = {};
        enriched.forEach(e => {
            const sid = e.question.subject_id;
            if (!groupMap[sid]) {
                groupMap[sid] = {
                    subject_id: sid,
                    subject_name: e.subject_name,
                    errors: [],
                    total: 0,
                    retried: 0,
                };
            }
            groupMap[sid].errors.push(e);
            groupMap[sid].total++;
        });

        const sorted = Object.values(groupMap).sort((a, b) => b.total - a.total);
        setGroups(sorted);
        setTotalErrors(enriched.length);
        setLoading(false);
    };

    // Start practice mode with errors from a specific subject or all
    const startPractice = (subjectId?: string) => {
        let questions: WrongAnswer[] = [];
        if (subjectId) {
            const group = groups.find(g => g.subject_id === subjectId);
            questions = group?.errors || [];
        } else {
            questions = groups.flatMap(g => g.errors);
        }

        // Shuffle
        const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 20);
        setPracticeQuestions(shuffled);
        setPracticeIndex(0);
        setSelectedOption(null);
        setAnswered(false);
        setPracticeStats({ correct: 0, total: 0 });
        setPracticing(true);
    };

    const handlePracticeAnswer = async (optionId: string) => {
        if (answered) return;
        setSelectedOption(optionId);
        setAnswered(true);

        const currentQ = practiceQuestions[practiceIndex];
        const isCorrect = currentQ.question.options.find(o => o.id === optionId)?.is_correct || false;

        setPracticeStats(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
        }));

        // Save the retry answer
        if (user) {
            await supabase.from("user_answers").insert({
                user_id: user.id,
                question_id: currentQ.question_id,
                selected_option_id: optionId,
                is_correct: isCorrect,
                answered_at: new Date().toISOString(),
            });
        }
    };

    const nextPracticeQuestion = () => {
        if (practiceIndex + 1 >= practiceQuestions.length) {
            toast.success(`Prática concluída! ${practiceStats.correct}/${practiceStats.total} acertos`);
            setPracticing(false);
            loadErrors(); // Refresh
            return;
        }
        setPracticeIndex(prev => prev + 1);
        setSelectedOption(null);
        setAnswered(false);
    };

    const filteredGroups = filterSubject
        ? groups.filter(g => g.subject_id === filterSubject)
        : groups;

    // ─── Practice Mode ───
    if (practicing && practiceQuestions.length > 0) {
        const q = practiceQuestions[practiceIndex];
        const correctOption = q.question.options.find(o => o.is_correct);
        const progress = ((practiceIndex + 1) / practiceQuestions.length) * 100;

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
                            <Brain className="w-6 h-6 text-primary" /> Re-praticando Erros
                        </h1>
                        <p className="text-sm text-muted-foreground">{q.subject_name}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPracticing(false)}>Sair</Button>
                </div>

                <div className="flex items-center gap-3">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-mono text-muted-foreground">{practiceIndex + 1}/{practiceQuestions.length}</span>
                </div>

                <Card className="glass-card">
                    <CardContent className="p-6 space-y-6">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.question.statement}</p>

                        <div className="space-y-2">
                            {q.question.options.map(opt => {
                                let optClass = "border-border/50 hover:border-primary/50 bg-transparent cursor-pointer";
                                if (answered) {
                                    if (opt.is_correct) {
                                        optClass = "border-green-500/50 bg-green-500/10 text-green-400";
                                    } else if (opt.id === selectedOption && !opt.is_correct) {
                                        optClass = "border-red-500/50 bg-red-500/10 text-red-400";
                                    } else {
                                        optClass = "opacity-50 border-border/30";
                                    }
                                }
                                return (
                                    <button
                                        key={opt.id}
                                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${optClass}`}
                                        onClick={() => handlePracticeAnswer(opt.id)}
                                        disabled={answered}
                                    >
                                        <span className="font-mono font-bold text-sm shrink-0 w-6">{opt.label})</span>
                                        <span className="text-sm">{opt.text}</span>
                                        {answered && opt.is_correct && <CheckCircle className="w-4 h-4 text-green-500 shrink-0 ml-auto" />}
                                        {answered && opt.id === selectedOption && !opt.is_correct && <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-auto" />}
                                    </button>
                                );
                            })}
                        </div>

                        {answered && q.question.explanation && (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                                <p className="text-xs font-bold text-primary uppercase tracking-wider">Explicação</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{q.question.explanation}</p>
                            </div>
                        )}

                        {answered && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-green-500 font-mono font-bold">{practiceStats.correct}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="font-mono font-bold">{practiceStats.total}</span>
                                    <span className="text-muted-foreground">acertos</span>
                                </div>
                                <Button className="gradient-primary" onClick={nextPracticeQuestion}>
                                    {practiceIndex + 1 >= practiceQuestions.length ? "Finalizar" : "Próxima"} <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Main View ───
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
                        <BookX className="w-6 h-6 text-red-500" /> Caderno de Erros
                    </h1>
                    <p className="text-muted-foreground text-sm">Suas questões erradas, organizadas para revisar e dominar</p>
                </div>
                {totalErrors > 0 && (
                    <Button className="gradient-primary gap-2" onClick={() => startPractice()}>
                        <RefreshCcw className="w-4 h-4" /> Praticar Todos os Erros
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : totalErrors === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto">
                            <Sparkles className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="font-heading font-bold text-xl">Nenhum erro encontrado!</h2>
                        <p className="text-muted-foreground text-sm">Continue resolvendo questões. Quando errar alguma, ela aparecerá aqui automaticamente.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{totalErrors}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Questões Erradas</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{groups.length}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matérias</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <Target className="w-5 h-5 text-accent mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{groups[0]?.subject_name?.slice(0, 10) || "-"}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mais Erros</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                                <Brain className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                <p className="text-2xl font-heading font-bold font-mono">{Math.min(20, totalErrors)}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Para Praticar</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant={!filterSubject ? "default" : "outline"}
                            size="sm"
                            className={!filterSubject ? "gradient-primary" : ""}
                            onClick={() => setFilterSubject(null)}
                        >
                            Todas ({totalErrors})
                        </Button>
                        {groups.map(g => (
                            <Button
                                key={g.subject_id}
                                variant={filterSubject === g.subject_id ? "default" : "outline"}
                                size="sm"
                                className={filterSubject === g.subject_id ? "gradient-primary" : ""}
                                onClick={() => setFilterSubject(g.subject_id)}
                            >
                                {g.subject_name} ({g.total})
                            </Button>
                        ))}
                    </div>

                    {/* Subject accordion */}
                    <div className="space-y-3">
                        {filteredGroups.map(group => (
                            <Card key={group.subject_id} className="glass-card">
                                <CardContent className="p-0">
                                    {/* Subject header */}
                                    <button
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors rounded-xl"
                                        onClick={() => setExpandedSubject(expandedSubject === group.subject_id ? null : group.subject_id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                <BookX className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-heading font-bold text-sm">{group.subject_name}</h3>
                                                <p className="text-xs text-muted-foreground">{group.total} erro{group.total !== 1 ? "s" : ""}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                                                onClick={(e) => { e.stopPropagation(); startPractice(group.subject_id); }}
                                            >
                                                <RefreshCcw className="w-3 h-3 mr-1" /> Praticar
                                            </Button>
                                            {expandedSubject === group.subject_id ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Questions list */}
                                    {expandedSubject === group.subject_id && (
                                        <div className="border-t border-border/30 divide-y divide-border/20">
                                            {group.errors.map((error, idx) => (
                                                <div key={error.id} className="p-4">
                                                    <button
                                                        className="w-full text-left flex items-start gap-3"
                                                        onClick={() => setExpandedQuestion(expandedQuestion === error.id ? null : error.id)}
                                                    >
                                                        <Badge variant="outline" className="shrink-0 mt-0.5 text-[10px] font-mono">
                                                            #{idx + 1}
                                                        </Badge>
                                                        <p className="text-sm line-clamp-2 flex-1">{error.question.statement}</p>
                                                        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedQuestion === error.id ? "rotate-90" : ""}`} />
                                                    </button>

                                                    {expandedQuestion === error.id && (
                                                        <div className="mt-4 ml-8 space-y-2">
                                                            {error.question.options.map(opt => {
                                                                const wasSelected = opt.id === error.selected_option_id;
                                                                const isCorrect = opt.is_correct;
                                                                let cls = "border-border/30 text-muted-foreground";
                                                                if (isCorrect) cls = "border-green-500/30 bg-green-500/5 text-green-400";
                                                                else if (wasSelected) cls = "border-red-500/30 bg-red-500/5 text-red-400";
                                                                return (
                                                                    <div key={opt.id} className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${cls}`}>
                                                                        <span className="font-mono font-bold shrink-0">{opt.label})</span>
                                                                        <span className="flex-1">{opt.text}</span>
                                                                        {isCorrect && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                                                        {wasSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                                    </div>
                                                                );
                                                            })}
                                                            {error.question.explanation && (
                                                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2">
                                                                    <p className="text-xs font-bold text-primary mb-1">Explicação:</p>
                                                                    <p className="text-xs text-muted-foreground">{error.question.explanation}</p>
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] text-muted-foreground">
                                                                Errado em: {new Date(error.answered_at).toLocaleDateString("pt-BR")}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
