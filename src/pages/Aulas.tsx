import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ChevronRight, CheckCircle, Lock, Volume2, VolumeX, Video, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

export default function Aulas() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [allLessonsBySubject, setAllLessonsBySubject] = useState<Record<string, number>>({});
  const [completedBySubject, setCompletedBySubject] = useState<Record<string, number>>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const synthRef = useRef(window.speechSynthesis);

  // Load feature toggles
  useEffect(() => {
    supabase.from("platform_settings").select("key, value").in("key", ["tts_enabled", "video_lessons_enabled"]).then(({ data }) => {
      data?.forEach(s => {
        if (s.key === "tts_enabled") setTtsEnabled(s.value === "true");
        if (s.key === "video_lessons_enabled") setVideoEnabled(s.value === "true");
      });
    });
  }, []);

  useEffect(() => {
    supabase.from("subjects").select("*").order("order_index").then(({ data }) => setSubjects(data ?? []));
  }, []);

  // Load progress stats per subject
  useEffect(() => {
    if (!user) return;
    // Get all lessons grouped by subject via topics
    const loadProgress = async () => {
      const { data: topicsData } = await supabase.from("topics").select("id, subject_id");
      const { data: lessonsData } = await supabase.from("lessons").select("id, topic_id");
      const { data: progressData } = await supabase.from("user_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true);

      if (!topicsData || !lessonsData) return;

      const topicToSubject: Record<string, string> = {};
      topicsData.forEach(t => { topicToSubject[t.id] = t.subject_id; });

      const totalBySubject: Record<string, number> = {};
      const lessonSubjectMap: Record<string, string> = {};
      lessonsData.forEach(l => {
        const subjectId = topicToSubject[l.topic_id];
        if (subjectId) {
          totalBySubject[subjectId] = (totalBySubject[subjectId] || 0) + 1;
          lessonSubjectMap[l.id] = subjectId;
        }
      });

      const completedSet = new Set(progressData?.map(p => p.lesson_id!).filter(Boolean) ?? []);
      setCompletedIds(completedSet);

      const doneBySubject: Record<string, number> = {};
      completedSet.forEach(lessonId => {
        const subjectId = lessonSubjectMap[lessonId];
        if (subjectId) doneBySubject[subjectId] = (doneBySubject[subjectId] || 0) + 1;
      });

      setAllLessonsBySubject(totalBySubject);
      setCompletedBySubject(doneBySubject);
    };
    loadProgress();
  }, [user]);

  useEffect(() => {
    if (!selectedSubject) return;
    supabase.from("topics").select("*").eq("subject_id", selectedSubject).order("order_index").then(({ data }) => {
      setTopics(data ?? []);
      setSelectedTopic(null);
      setSelectedLesson(null);
    });
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedTopic) return;
    supabase.from("lessons").select("*").eq("topic_id", selectedTopic).order("order_index").then(({ data }) => {
      setLessons(data ?? []);
      setSelectedLesson(null);
    });
  }, [selectedTopic]);

  const markComplete = async (lessonId: string) => {
    if (!user) return;
    await supabase.from("user_progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
    setCompletedIds(prev => new Set(prev).add(lessonId));
    // Update subject progress
    if (selectedSubject) {
      setCompletedBySubject(prev => ({
        ...prev,
        [selectedSubject]: (prev[selectedSubject] || 0) + 1,
      }));
    }
  };

  const resetSubjectProgress = async (subjectId: string) => {
    if (!user) return;
    // Get all lesson IDs for this subject
    const { data: topicsData } = await supabase.from("topics").select("id").eq("subject_id", subjectId);
    if (!topicsData) return;
    const topicIds = topicsData.map(t => t.id);
    const { data: lessonsData } = await supabase.from("lessons").select("id").in("topic_id", topicIds);
    if (!lessonsData) return;
    const lessonIds = lessonsData.map(l => l.id);

    // Delete progress for these lessons
    await supabase.from("user_progress").delete().eq("user_id", user.id).in("lesson_id", lessonIds);

    // Update local state
    setCompletedIds(prev => {
      const next = new Set(prev);
      lessonIds.forEach(id => next.delete(id));
      return next;
    });
    setCompletedBySubject(prev => ({ ...prev, [subjectId]: 0 }));
  };

  const stopSpeaking = useCallback(() => { synthRef.current.cancel(); setIsSpeaking(false); }, []);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) { stopSpeaking(); return; }
    if (!selectedLesson?.content) return;
    const plainText = selectedLesson.content.replace(/#{1,6}\s/g, "").replace(/\*{1,2}(.*?)\*{1,2}/g, "$1").replace(/\[.*?\]\(.*?\)/g, "").replace(/[`~>]/g, "").replace(/\n{2,}/g, ". ");
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "pt-BR"; utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, selectedLesson, stopSpeaking]);

  useEffect(() => { return () => { synthRef.current.cancel(); }; }, [selectedLesson]);

  const getVideoEmbed = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  // Lesson detail view
  if (selectedLesson) {
    const lessonIdx = lessons.findIndex(l => l.id === selectedLesson.id);
    const embedUrl = selectedLesson.video_url ? getVideoEmbed(selectedLesson.video_url) : null;

    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Button variant="ghost" onClick={() => { setSelectedLesson(null); stopSpeaking(); }} className="text-muted-foreground">← Voltar</Button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">Aula {String(lessonIdx + 1).padStart(2, "0")}</span>
          <h1 className="font-heading text-2xl font-bold">{selectedLesson.title}</h1>
        </div>

        {/* Lesson image */}
        {selectedLesson.image_url && (
          <img src={selectedLesson.image_url} alt={selectedLesson.title} className="w-full h-48 object-cover rounded-xl border border-border" />
        )}

        {/* Video player */}
        {videoEnabled && selectedLesson.video_url && (
          <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
            {embedUrl ? (
              <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={selectedLesson.title} />
            ) : (
              <video controls className="w-full h-full" src={selectedLesson.video_url}>Seu navegador não suporta vídeos.</video>
            )}
          </div>
        )}

        {/* TTS button */}
        {ttsEnabled && selectedLesson.content && (
          <Button variant="outline" size="sm" onClick={toggleTTS} className="gap-2">
            {isSpeaking ? <><VolumeX className="w-4 h-4" /> Parar Narração</> : <><Volume2 className="w-4 h-4" /> Ouvir Aula</>}
          </Button>
        )}

        <div className="prose prose-invert prose-lg max-w-none glass-card p-8 leading-relaxed prose-headings:font-heading prose-headings:text-foreground prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-muted-foreground prose-p:mb-4 prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-semibold prose-li:text-muted-foreground prose-li:mb-1 prose-ul:mb-4 prose-ol:mb-4 prose-a:text-primary prose-a:underline">
          {selectedLesson.content ? (
            <ReactMarkdown>{selectedLesson.content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Conteúdo da aula será adicionado em breve.</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {!completedIds.has(selectedLesson.id) ? (
            <Button onClick={() => markComplete(selectedLesson.id)} className="gradient-primary text-primary-foreground">
              <CheckCircle className="w-4 h-4 mr-2" /> Marcar como concluída
            </Button>
          ) : (
            <p className="text-[hsl(var(--chart-4))] flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Aula concluída</p>
          )}
          {/* Next lesson */}
          {lessonIdx < lessons.length - 1 && (
            <Button variant="outline" onClick={() => { stopSpeaking(); setSelectedLesson(lessons[lessonIdx + 1]); }}>
              Próxima Aula <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Subject list
  if (!selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-heading text-2xl font-bold">Aulas</h1>
        <p className="text-muted-foreground">Navegue pelo conteúdo do edital SD PMBA</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => {
            const total = allLessonsBySubject[s.id] || 0;
            const done = completedBySubject[s.id] || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isComplete = total > 0 && pct === 100;

            return (
              <Card key={s.id} className={`glass-card cursor-pointer transition-all hover:border-primary/30 ${isComplete ? "border-[hsl(var(--chart-4))]/30" : ""}`} onClick={() => setSelectedSubject(s.id)}>
                <CardContent className="p-0">
                  {s.image_url && (
                    <img src={s.image_url} alt={s.name} className="w-full h-32 object-cover rounded-t-xl" />
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-[hsl(var(--chart-4))]/10" : "bg-primary/10"}`}>
                          {isComplete ? <CheckCircle className="w-5 h-5 text-[hsl(var(--chart-4))]" /> : <BookOpen className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-heading font-semibold">{s.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                        </div>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{done}/{total} aulas</span>
                          <span className={`font-semibold ${isComplete ? "text-[hsl(var(--chart-4))]" : "text-primary"}`}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        {isComplete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); resetSubjectProgress(s.id); }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recomeçar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Topics list
  if (!selectedTopic) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelectedSubject(null)} className="text-muted-foreground">← Matérias</Button>
        <h2 className="font-heading text-xl font-bold">{subjects.find(s => s.id === selectedSubject)?.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map(t => (
            <Card key={t.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedTopic(t.id)}>
              <CardContent className="p-0">
                {t.image_url && <img src={t.image_url} alt={t.name} className="w-full h-28 object-cover rounded-t-xl" />}
                <div className="p-5 flex items-center justify-between">
                  <p className="font-heading font-semibold">{t.name}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {topics.length === 0 && <p className="text-muted-foreground text-sm">Nenhum assunto disponível.</p>}
        </div>
      </div>
    );
  }

  // Lessons list
  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => setSelectedTopic(null)} className="text-muted-foreground">← Assuntos</Button>
      <h2 className="font-heading text-xl font-bold">{topics.find(t => t.id === selectedTopic)?.name}</h2>
      <div className="space-y-3">
        {lessons.map((l, idx) => {
          const locked = l.is_premium && !isActive;
          return (
            <Card
              key={l.id}
              className={`glass-card cursor-pointer transition-colors ${locked ? "opacity-60" : "hover:border-primary/30"}`}
              onClick={() => locked ? navigate("/assinatura") : setSelectedLesson(l)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Lesson number circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  completedIds.has(l.id)
                    ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]"
                    : locked
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}>
                  {completedIds.has(l.id) ? <CheckCircle className="w-5 h-5" /> : locked ? <Lock className="w-4 h-4" /> : String(idx + 1).padStart(2, "0")}
                </div>

                {/* Thumbnail */}
                {l.image_url && <img src={l.image_url} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />}

                <div className="flex-1 min-w-0">
                  <p className="font-medium">Aula {String(idx + 1).padStart(2, "0")} — {l.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {l.video_url && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">VÍDEO</span>}
                    {locked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent">PREMIUM</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );
        })}
        {lessons.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma aula disponível neste assunto.</p>}
      </div>
    </div>
  );
}
