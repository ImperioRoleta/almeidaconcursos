import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Clock, Target, Flame, Crown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type RankEntry = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_hours: number;
  accuracy: number;
  streak: number;
  level_name: string;
};

export default function Ranking() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"hours" | "accuracy">("hours");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (!error && data) setEntries(data as RankEntry[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const sorted = [...entries].sort((a, b) =>
    sortBy === "hours" ? b.total_hours - a.total_hours : b.accuracy - a.accuracy
  );

  const podiumColors = [
    "from-[hsl(43,76%,53%)] to-[hsl(43,90%,65%)]",
    "from-[hsl(0,0%,65%)] to-[hsl(0,0%,80%)]",
    "from-[hsl(25,60%,45%)] to-[hsl(25,70%,55%)]",
  ];
  const podiumIcons = [Crown, Medal, Medal];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent" /> Ranking
          </h1>
          <p className="text-muted-foreground text-sm">Competição saudável entre alunos</p>
        </div>
        <div className="flex gap-2">
          {(["hours", "accuracy"] as const).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === key
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {key === "hours" ? "Horas de Estudo" : "Taxa de Acerto"}
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
          {/* Podium - Top 3 */}
          {sorted.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[1, 0, 2].map((rank) => {
                const entry = sorted[rank];
                if (!entry) return null;
                const PodiumIcon = podiumIcons[rank];
                const isCenter = rank === 0;
                return (
                  <Card key={rank} className={`glass-card overflow-hidden text-center ${isCenter ? "lg:-mt-4 border-accent/30 glow-gold" : ""} ${entry.user_id === user?.id ? "ring-1 ring-primary" : ""}`}>
                    <CardContent className={`p-4 ${isCenter ? "pt-6" : "pt-5"}`}>
                      <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${podiumColors[rank]} flex items-center justify-center mb-3 ${isCenter ? "w-16 h-16" : ""}`}>
                        <PodiumIcon className={`text-background ${isCenter ? "w-7 h-7" : "w-5 h-5"}`} />
                      </div>
                      <p className="font-heading font-bold text-sm truncate">{entry.name || "Aluno"}</p>
                      <Badge variant="outline" className="text-[10px] mt-1 border-accent/30 text-accent">{entry.level_name}</Badge>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> {entry.total_hours}h</p>
                        <p className="flex items-center justify-center gap-1"><Target className="w-3 h-3" /> {entry.accuracy}%</p>
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
              <CardTitle className="text-sm font-heading text-muted-foreground uppercase tracking-wider">Classificação Geral</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {sorted.map((entry, i) => {
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
                      <div className="flex items-center gap-5 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> <span className="font-mono">{entry.total_hours}h</span></span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3.5 h-3.5" /> <span className="font-mono">{entry.accuracy}%</span></span>
                      </div>
                    </div>
                  );
                })}
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
