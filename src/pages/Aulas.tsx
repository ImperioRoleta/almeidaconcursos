/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, CheckCircle2, ChevronRight, PlayCircle, Loader2,
  Search, Book, Play, Clock, Award, Lock, Sparkles, RotateCcw, Layers, GraduationCap, ArrowLeft, FileText,
  ChevronLeft, Video, Volume2, VolumeX, CheckCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import LessonQuestions from "@/components/LessonQuestions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

const LessonContentTabs = ({ videoPlayer, writtenContent }: { videoPlayer: React.ReactNode; writtenContent: React.ReactNode }) => (
  <Tabs defaultValue="video" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="video" className="gap-2"><Video className="w-4 h-4" /> Vídeo Aula</TabsTrigger>
      <TabsTrigger value="apostila" className="gap-2"><FileText className="w-4 h-4" /> Apostila Escrita</TabsTrigger>
    </TabsList>
    <TabsContent value="video">{videoPlayer}</TabsContent>
    <TabsContent value="apostila" className="space-y-4">{writtenContent}</TabsContent>
  </Tabs>
);

export default function Aulas() {
  const { user } = useAuth();
  const { canAccessFullLessons, isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [allLessonsBySubject, setAllLessonsBySubject] = useState<Record<string, number>>({});
  const [completedBySubject, setCompletedBySubject] = useState<Record<string, number>>({});
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [topicLessonCounts, setTopicLessonCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

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
    const loadProgress = async () => {
      const { data: topicsData } = await supabase.from("topics").select("id, subject_id");
      const { data: lessonsData } = await supabase.from("lessons").select("id, topic_id");
      const { data: progressData } = await supabase.from("user_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true);

      if (!topicsData || !lessonsData) return;

      const topicToSubject: Record<string, string> = {};
      topicsData.forEach(t => { topicToSubject[t.id] = t.subject_id; });

      // Count topics per subject
      const tCounts: Record<string, number> = {};
      topicsData.forEach(t => { tCounts[t.subject_id] = (tCounts[t.subject_id] || 0) + 1; });
      setTopicCounts(tCounts);

      const totalBySubject: Record<string, number> = {};
      const lessonSubjectMap: Record<string, string> = {};
      const lessonTopicMap: Record<string, string> = {};
      const totalByTopic: Record<string, number> = {};
      lessonsData.forEach(l => {
        const subjectId = topicToSubject[l.topic_id];
        if (subjectId) {
          totalBySubject[subjectId] = (totalBySubject[subjectId] || 0) + 1;
          lessonSubjectMap[l.id] = subjectId;
        }
        lessonTopicMap[l.id] = l.topic_id;
        totalByTopic[l.topic_id] = (totalByTopic[l.topic_id] || 0) + 1;
      });

      const completedSet = new Set(progressData?.map(p => p.lesson_id!).filter(Boolean) ?? []);
      setCompletedIds(completedSet);

      const doneBySubject: Record<string, number> = {};
      const doneByTopic: Record<string, number> = {};
      completedSet.forEach(lessonId => {
        const subjectId = lessonSubjectMap[lessonId];
        if (subjectId) doneBySubject[subjectId] = (doneBySubject[subjectId] || 0) + 1;
        const topicId = lessonTopicMap[lessonId];
        if (topicId) doneByTopic[topicId] = (doneByTopic[topicId] || 0) + 1;
      });

      setAllLessonsBySubject(totalBySubject);
      setCompletedBySubject(doneBySubject);

      const tlc: Record<string, { total: number; done: number }> = {};
      Object.keys(totalByTopic).forEach(tid => {
        tlc[tid] = { total: totalByTopic[tid], done: doneByTopic[tid] || 0 };
      });
      setTopicLessonCounts(tlc);
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
    if (selectedSubject) {
      setCompletedBySubject(prev => ({
        ...prev,
        [selectedSubject]: (prev[selectedSubject] || 0) + 1,
      }));
    }
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const resetSubjectProgress = async (subjectId: string) => {
    if (!user) return;
    const { data: topicsData } = await supabase.from("topics").select("id").eq("subject_id", subjectId);
    if (!topicsData) return;
    const topicIds = topicsData.map(t => t.id);
    const { data: lessonsData } = await supabase.from("lessons").select("id").in("topic_id", topicIds);
    if (!lessonsData) return;
    const lessonIds = lessonsData.map(l => l.id);
    await supabase.from("user_progress").delete().eq("user_id", user.id).in("lesson_id", lessonIds);
    setCompletedIds(prev => {
      const next = new Set(prev);
      lessonIds.forEach(id => next.delete(id));
      return next;
    });
    setCompletedBySubject(prev => ({ ...prev, [subjectId]: 0 }));
  };

  const stopSpeaking = useCallback(() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }, []);

  const toggleTTS = useCallback(() => {
    if (isSpeaking) { stopSpeaking(); return; }
    if (!selectedLesson?.content) return;
    const plainText = selectedLesson.content.replace(/#{1,6}\s/g, "").replace(/\*{1,2}(.*?)\*{1,2}/g, "$1").replace(/\[.*?\]\(.*?\)/g, "").replace(/[`~>]/g, "").replace(/\n{2,}/g, ". ");
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "pt-BR"; utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, selectedLesson, stopSpeaking]);

  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, [selectedLesson]);

  const getVideoEmbed = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const subjectGradients = [
    "from-primary/20 to-[hsl(195,85%,48%)]/10",
    "from-accent/20 to-[hsl(38,92%,50%)]/10",
    "from-[hsl(152,69%,42%)]/20 to-[hsl(160,60%,50%)]/10",
    "from-[hsl(280,70%,55%)]/20 to-[hsl(320,75%,55%)]/10",
    "from-[hsl(25,95%,53%)]/20 to-[hsl(38,92%,50%)]/10",
    "from-[hsl(195,85%,48%)]/20 to-primary/10",
  ];

  const subjectIconColors = [
    "text-primary", "text-accent", "text-[hsl(152,69%,42%)]",
    "text-[hsl(280,70%,55%)]", "text-[hsl(25,95%,53%)]", "text-[hsl(195,85%,48%)]",
  ];

  // ─── Breadcrumb ───
  const Breadcrumb = () => {
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name;
    const topicName = topics.find(t => t.id === selectedTopic)?.name;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button onClick={() => { setSelectedSubject(null); setSelectedTopic(null); setSelectedLesson(null); stopSpeaking(); }} className="hover:text-foreground transition-colors font-medium">
          Matérias
        </button>
        {selectedSubject && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => { setSelectedTopic(null); setSelectedLesson(null); stopSpeaking(); }} className="hover:text-foreground transition-colors font-medium">
              {subjectName}
            </button>
          </>
        )}
        {selectedTopic && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{topicName}</span>
          </>
        )}
      </div>
    );
  };

  // ─── Lesson Detail ───
  if (selectedLesson) {
    const lessonIdx = lessons.findIndex(l => l.id === selectedLesson.id);
    const embedUrl = selectedLesson.video_url ? getVideoEmbed(selectedLesson.video_url) : null;

    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Breadcrumb />

        {/* Header */}
        <div className="relative">
          {selectedLesson.image_url && (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-4">
              <img src={selectedLesson.image_url} alt={selectedLesson.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-primary/20 text-primary backdrop-blur-sm text-xs mb-2">
                  Aula {String(lessonIdx + 1).padStart(2, "0")}
                </Badge>
                <h1 className="font-heading text-2xl font-bold">{selectedLesson.title}</h1>
              </div>
            </div>
          )}
          {!selectedLesson.image_url && (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="font-mono font-bold text-primary text-sm">{String(lessonIdx + 1).padStart(2, "0")}</span>
              </div>
              <h1 className="font-heading text-2xl font-bold">{selectedLesson.title}</h1>
            </div>
          )}
        </div>

        {/* Content: Video / Apostila / Tabs */}
        {(() => {
          const hasVideo = videoEnabled && !!selectedLesson.video_url;
          const hasContent = !!selectedLesson.content?.trim();
          const hasBoth = hasVideo && hasContent;

          const VideoPlayer = () => (
            <div className="rounded-2xl overflow-hidden border border-border bg-black aspect-video shadow-xl">
              {embedUrl ? (
                <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={selectedLesson.title} />
              ) : (
                <video controls className="w-full h-full" src={selectedLesson.video_url}>Seu navegador não suporta vídeos.</video>
              )}
            </div>
          );

          const WrittenContent = () => (
            <>
              {ttsEnabled && hasContent && (
                <Button variant="outline" size="sm" onClick={toggleTTS} className="gap-2">
                  {isSpeaking ? <><VolumeX className="w-4 h-4" /> Parar Narração</> : <><Volume2 className="w-4 h-4" /> Ouvir Aula</>}
                </Button>
              )}
              <div className="prose prose-invert prose-lg max-w-none glass-card p-8 leading-relaxed prose-headings:font-heading prose-headings:text-foreground prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-muted-foreground prose-p:mb-4 prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-semibold prose-li:text-muted-foreground prose-li:mb-1 prose-ul:mb-4 prose-ol:mb-4 prose-a:text-primary prose-a:underline">
                <ReactMarkdown>{selectedLesson.content}</ReactMarkdown>
              </div>
            </>
          );

          if (hasBoth) {
            return (
              <LessonContentTabs
                videoPlayer={<VideoPlayer />}
                writtenContent={<WrittenContent />}
              />
            );
          }
          if (hasVideo) return <VideoPlayer />;
          if (hasContent) return <WrittenContent />;
          return (
            <div className="glass-card p-8">
              <p className="text-muted-foreground italic">Conteúdo da aula será adicionado em breve.</p>
            </div>
          );
        })()}

        {/* Inline questions for this topic */}
        {selectedLesson && <LessonQuestions lessonId={selectedLesson.id} />}

        <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/50">
          <div className="flex items-center gap-3">
            {lessonIdx > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => { stopSpeaking(); setSelectedLesson(lessons[lessonIdx - 1]); }}
                className="rounded-xl border-border/40 hover:bg-muted/50 transition-all hover:-translate-x-1"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
              </Button>
            )}

            {!completedIds.has(selectedLesson.id) ? (
              <Button
                onClick={() => markComplete(selectedLesson.id)}
                size="lg"
                className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-6 hover:scale-105 transition-all"
              >
                <CheckCircle className="w-5 h-5 mr-2" /> Concluir Aula
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/20">
                <CheckCircle className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                <span className="text-[hsl(var(--chart-4))] text-sm font-bold uppercase tracking-wider">Concluída</span>
              </div>
            )}
          </div>

          {lessonIdx < lessons.length - 1 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => { stopSpeaking(); setSelectedLesson(lessons[lessonIdx + 1]); }}
              className="rounded-xl border-border/40 hover:bg-muted/50 transition-all hover:translate-x-1"
            >
              Próxima <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>

        {/* Celebration Overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="bg-background/80 backdrop-blur-xl p-10 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_100px_rgba(25, 118, 210, 0.2)] text-center relative overflow-hidden mx-4"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-[hsl(var(--chart-4))]/10" />
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.2, 1, 1.2, 1]
                  }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="inline-block mb-6 relative z-10"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-heading font-bold mb-2 relative z-10">Sensacional! 🚀</h2>
                <p className="text-muted-foreground font-medium relative z-10">Você acabou de concluir mais uma etapa rumo à aprovação.</p>

                {/* Decoration particles */}
                <motion.div
                  className="absolute top-10 left-10 text-primary opacity-40"
                  animate={{ y: [-10, 10], opacity: [0.4, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
                <motion.div
                  className="absolute bottom-10 right-10 text-[hsl(var(--chart-4))] opacity-40"
                  animate={{ y: [10, -10], opacity: [0.4, 0.8] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Subject List ───
  if (!selectedSubject) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" /> Aulas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Navegue pelo conteúdo do edital</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {subjects.map((s, idx) => {
            const total = allLessonsBySubject[s.id] || 0;
            const done = completedBySubject[s.id] || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isComplete = total > 0 && pct === 100;
            const gradient = subjectGradients[idx % subjectGradients.length];
            const iconColor = subjectIconColors[idx % subjectIconColors.length];
            const topicCount = topicCounts[s.id] || 0;

            return (
              <Card
                key={s.id}
                className={`glass-card-hover cursor-pointer overflow-hidden group ${isComplete ? "border-[hsl(var(--chart-4))]/30" : ""}`}
                onClick={() => setSelectedSubject(s.id)}
              >
                <CardContent className="p-0">
                  {s.image_url ? (
                    <div className="relative h-36 overflow-hidden">
                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                    </div>
                  ) : (
                    <div className={`h-24 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <BookOpen className={`w-10 h-10 ${iconColor} opacity-40`} />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-heading font-bold text-base">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>}
                      </div>
                      {isComplete && <CheckCircle2 className="w-5 h-5 text-[hsl(var(--chart-4))] shrink-0" />}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {topicCount} assuntos</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {total} aulas</span>
                    </div>

                    {total > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{done}/{total} concluídas</span>
                          <span className={`font-semibold font-mono ${isComplete ? "text-[hsl(var(--chart-4))]" : "text-primary"}`}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        {isComplete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                            onClick={(e) => { e.stopPropagation(); resetSubjectProgress(s.id); }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar Matéria
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

  // ─── Topics List ───
  if (!selectedTopic) {
    const currentSubject = subjects.find(s => s.id === selectedSubject);
    return (
      <div className="space-y-6 animate-fade-in">
        <Breadcrumb />

        <div className="flex items-center gap-4">
          {currentSubject?.image_url && (
            <img src={currentSubject.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
          )}
          <div>
            <h2 className="font-heading text-xl font-bold">{currentSubject?.name}</h2>
            {currentSubject?.description && <p className="text-sm text-muted-foreground">{currentSubject.description}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {topics.map((t, idx) => {
            const tlc = topicLessonCounts[t.id];
            const topicPct = tlc && tlc.total > 0 ? Math.round((tlc.done / tlc.total) * 100) : 0;
            const topicComplete = tlc && tlc.total > 0 && topicPct === 100;

            return (
              <Card
                key={t.id}
                className={`glass-card-hover cursor-pointer overflow-hidden ${topicComplete ? "border-[hsl(var(--chart-4))]/30" : ""}`}
                onClick={() => setSelectedTopic(t.id)}
              >
                <CardContent className="p-0">
                  {t.image_url && (
                    <img src={t.image_url} alt={t.name} className="w-full h-28 object-cover" />
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-sm ${topicComplete ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" : "bg-primary/10 text-primary"}`}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold truncate">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    {tlc && tlc.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{tlc.done}/{tlc.total} aulas</span>
                          <span className="font-mono font-semibold">{topicPct}%</span>
                        </div>
                        <Progress value={topicPct} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {topics.length === 0 && <p className="text-muted-foreground text-sm col-span-2">Nenhum assunto disponível.</p>}
        </div>
      </div>
    );
  }

  // ─── Lessons List (Timeline) ───
  const currentTopic = topics.find(t => t.id === selectedTopic);
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Breadcrumb />

      <div className="flex items-center gap-3">
        {currentTopic?.image_url && (
          <img src={currentTopic.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border" />
        )}
        <div>
          <h2 className="font-heading text-xl font-bold">{currentTopic?.name}</h2>
          <p className="text-xs text-muted-foreground">{lessons.length} aulas neste assunto</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

        <div className="space-y-1">
          {lessons.map((l, idx) => {
            const locked = !subLoading && l.is_premium && !isActive;
            const isDone = completedIds.has(l.id);
            const isFirst = idx === 0;
            const isLast = idx === lessons.length - 1;

            return (
              <div key={l.id} className="relative group">
                {/* Timeline dot */}
                <div className={`absolute -left-8 top-4 w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center z-10 transition-all ${isDone
                  ? "bg-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))] shadow-md shadow-[hsl(var(--chart-4))]/20"
                  : locked
                    ? "bg-muted border-border"
                    : "bg-card border-primary/50 group-hover:border-primary group-hover:shadow-md group-hover:shadow-primary/10"
                  }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  ) : locked ? (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <span className="font-mono font-bold text-xs text-primary">{String(idx + 1).padStart(2, "0")}</span>
                  )}
                </div>

                {/* Card */}
                <Card
                  className={`glass-card ml-2 cursor-pointer transition-all ${locked ? "opacity-50" : "hover:border-primary/30 hover:translate-x-1"
                    } ${isDone ? "border-[hsl(var(--chart-4))]/20" : ""}`}
                  onClick={() => locked ? navigate("/assinatura") : setSelectedLesson(l)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Thumbnail */}
                    {l.image_url && (
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                        <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                        {l.video_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isDone ? "text-muted-foreground" : ""}`}>
                        <span className="font-mono text-xs text-muted-foreground mr-1.5">Aula {String(idx + 1).padStart(2, "0")}</span>
                        — {l.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {l.video_url && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 gap-1 border-primary/30 text-primary">
                            <Video className="w-2.5 h-2.5" /> Vídeo
                          </Badge>
                        )}
                        {l.content?.trim() && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 gap-1 border-[hsl(var(--chart-4))]/30 text-[hsl(var(--chart-4))]">
                            <FileText className="w-2.5 h-2.5" /> Apostila
                          </Badge>
                        )}
                        {locked && (
                          <Badge className="text-[9px] py-0 px-1.5 bg-accent/10 text-accent border-0">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Premium
                          </Badge>
                        )}
                        {isDone && (
                          <span className="text-[10px] text-[hsl(var(--chart-4))]">Concluída</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {lessons.length === 0 && (
          <p className="text-muted-foreground text-sm ml-2">Nenhuma aula disponível neste assunto.</p>
        )}
      </div>
    </div>
  );
}
