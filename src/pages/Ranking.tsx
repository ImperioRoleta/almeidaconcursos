import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Clock, Target, Flame, Crown, User, BookOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PremiumGate from "@/components/PremiumGate";

type RankEntry = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_hours: number;
  accuracy: number;
  streak: number;
  level_name: string;
};

type SortKey = "hours" | "accuracy" | "streak";
type TimeFilter = "all" | "week";

const FREE_VISIBLE_LIMIT = 3;

export default function Ranking() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("hours");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("id, name").order("order_index").then(({ data }) => {
      setSubjects(data ?? []);
    });
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter, selectedSubject]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    if (!selectedSubject && timeFilter === "all") {
      const { data } = await supabase.rpc("get_leaderboard");
      if (data) setEntries(data as RankEntry[]);
    } else {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url, level_id, levels(name)");

      let sessionsQuery = supabase.from("study_sessions").select("user_id, duration_seconds, started_at");
      let answersQuery = supabase.from("user_answers").select("user_id, is_correct, answered_at, question_id");

      if (timeFilter === "week") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        sessionsQuery = sessionsQuery.gte("started_at", weekAgo);
        answersQuery = answersQuery.gte("answered_at", weekAgo);
      }

      const [sessionsRes, answersRes] = await Promise.all([sessionsQuery, answersQuery]);
      const sessions = sessionsRes.data ?? [];
      let answers = answersRes.data ?? [];

      if (selectedSubject) {
        const { data: qs } = await supabase.from("questions").select("id").eq("subject_id", selectedSubject);
        const questionIds = new Set(qs?.map(q => q.id) ?? []);
        answers = answers.filter(a => questionIds.has(a.question_id));
      }

      const userMap = new Map<string, { hours: number; correct: number; total: number; days: Set<string> }>();

      for (const s of sessions) {
        if (!userMap.has(s.user_id)) userMap.set(s.user_id, { hours: 0, correct: 0, total: 0, days: new Set() });
        const u = userMap.get(s.user_id)!;
        u.hours += (s.duration_seconds || 0) / 3600;
        u.days.add(new Date(s.started_at).toDateString());
      }

      for (const a of answers) {
        if (!userMap.has(a.user_id)) userMap.set(a.user_id, { hours: 0, correct: 0, total: 0, days: new Set() });
        const u = userMap.get(a.user_id)!;
        u.total++;
        if (a.is_correct) u.correct++;
        u.days.add(new Date(a.answered_at).toDateString());
      }

      const result: RankEntry[] = [];
      for (const [uid, data] of userMap) {
        const p = (profiles ?? []).find((p: any) => p.user_id === uid);
        if (!p) continue;
        const sortedDays = [...data.days].map(d => new Date(d).getTime()).sort((a, b) => b - a);
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          if (data.days.has(d.toDateString())) streak++;
          else break;
        }
        result.push({
          user_id: uid, name: p.name || "Aluno", avatar_url: p.avatar_url,
          total_hours: Math.round(data.hours * 10) / 10,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          streak, level_name: (p as any).levels?.name || "Recruta",
        });
      }
      setEntries(result);
    }
    setLoading(false);
  };

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "hours") return b.total_hours - a.total_hours;
    if (sortBy === "accuracy") return b.accuracy - a.accuracy;
    return b.streak - a.streak;
  });

  const podiumColors = [
    "from-accent to-accent/70",
    "from-muted-foreground/60 to-muted-foreground/40",
    "from-[hsl(25,60%,45%)] to-[hsl(25,70%,55%)]",
  ];
  const podiumIcons = [Crown, Medal, Medal];

  const sortOptions: { key: SortKey; label: string; icon: any }[] = [
    { key: "hours", label: "Horas", icon: Clock },
    { key: "accuracy", label: "Acerto", icon: Target },
    { key: "streak", label: "Sequência", icon: Flame },
  ];

  // Visible entries for free users
  const visibleEntries = isActive ? sorted : sorted.slice(0, FREE_VISIBLE_LIMIT);
  const hiddenCount = isActive ? 0 : Math.max(0, sorted.length - FREE_VISIBLE_LIMIT);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-accent" /> Ranking
        </h1>
        <p className="text-muted-foreground text-sm">Competição saudável entre alunos</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {sortOptions.map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === opt.key ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              <opt.icon className="w-3 h-3" /> {opt.label}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {(["all", "week"] as const).map(t => (
            <button key={t} onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeFilter === t ? "bg-accent/10 text-accent border border-accent/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              {t === "all" ? "Geral" : "Esta Semana"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setSelectedSubject(null)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
              !selectedSubject ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50"
            }`}>
            Todas
          </button>
          {subjects.map(s => (
            <button key={s.id} onClick={() => setSelectedSubject(s.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                selectedSubject === s.id ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              {s.name.length > 15 ? s.name.slice(0, 15) + "…" : s.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {sorted.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[1, 0, 2].map((rank) => {
                const entry = sorted[rank];
                if (!entry) return null;
                const PodiumIcon = podiumIcons[rank];
                const isCenter = rank === 0;
                return (
                  <Card key={rank} className={`glass-card overflow-hidden text-center ${isCenter ? "lg:-mt-4 border-accent/30" : ""} ${entry.user_id === user?.id ? "ring-1 ring-primary" : ""}`}>
                    <CardContent className={`p-4 ${isCenter ? "pt-6" : "pt-5"}`}>
                      <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${podiumColors[rank]} flex items-center justify-center mb-3 ${isCenter ? "w-16 h-16" : ""}`}>
                        <PodiumIcon className={`text-primary-foreground ${isCenter ? "w-7 h-7" : "w-5 h-5"}`} />
                      </div>
                      <p className="font-heading font-bold text-sm truncate">{entry.name || "Aluno"}</p>
                      <Badge variant="outline" className="text-[10px] mt-1 border-accent/30 text-accent">{entry.level_name}</Badge>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> {entry.total_hours}h</p>
                        <p className="flex items-center justify-center gap-1"><Target className="w-3 h-3" /> {entry.accuracy}%</p>
                        <p className="flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> {entry.streak}d</p>
                      </div>
                      <p className="font-heading font-bold text-2xl mt-2 font-mono text-accent">#{rank + 1}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading text-muted-foreground uppercase tracking-wider">
                Classificação {selectedSubject ? `• ${subjects.find(s => s.id === selectedSubject)?.name}` : "Geral"}
                {timeFilter === "week" && " • Semanal"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {visibleEntries.map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <div key={entry.user_id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      <span className={`font-mono font-bold w-8 text-center text-sm ${i < 3 ? "text-accent" : "text-muted-foreground"}`}>
                        {i + 1}º
                      </span>
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isMe ? "text-primary" : ""}`}>
                          {entry.name || "Aluno"} {isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.level_name}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> <span className="font-mono">{entry.total_hours}h</span></span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3.5 h-3.5" /> <span className="font-mono">{entry.accuracy}%</span></span>
                        <span className="flex items-center gap-1 text-muted-foreground hidden sm:flex"><Flame className="w-3.5 h-3.5" /> <span className="font-mono">{entry.streak}d</span></span>
                      </div>
                    </div>
                  );
                })}

                {/* Premium gate for remaining entries */}
                {hiddenCount > 0 && (
                  <div className="relative">
                    {/* Blurred preview of next entries */}
                    <div className="opacity-30 blur-sm pointer-events-none">
                      {sorted.slice(FREE_VISIBLE_LIMIT, FREE_VISIBLE_LIMIT + 2).map((entry, i) => (
                        <div key={entry.user_id} className="flex items-center gap-4 px-4 py-3">
                          <span className="font-mono font-bold w-8 text-center text-sm text-muted-foreground">{FREE_VISIBLE_LIMIT + i + 1}º</span>
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1"><p className="font-medium text-sm">{entry.name}</p></div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm">
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-accent font-semibold">
                          <Lock className="w-4 h-4" />
                          +{hiddenCount} alunos
                        </div>
                        <Button size="sm" onClick={() => navigate("/assinatura")} className="gradient-gold text-accent-foreground text-xs">
                          Ver Ranking Completo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {sorted.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum aluno registrado ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
