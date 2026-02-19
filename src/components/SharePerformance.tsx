
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Trophy, Target, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface SharePerformanceProps {
    user: any;
    profile: any;
    stats: {
        hours: number;
        accuracy: number;
        lessons: number;
        questions: number;
        streak: number;
        simulations: number;
    };
    level: any;
    xp: { total: number };
}

export function SharePerformance({ user, profile, stats, level, xp }: SharePerformanceProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    const generateImage = async (action: "share" | "download") => {
        if (!cardRef.current) return;
        setGenerating(true);

        try {
            // Wait for images to load (just in case)
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: "#09090b", // zinc-950
                scale: 2, // High resolution
                useCORS: true,
                allowTaint: true,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error("Erro ao gerar imagem.");
                    setGenerating(false);
                    return;
                }

                if (action === "download") {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `elite-pmba-stats-${user.id.slice(0, 4)}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Imagem salva!");
                } else if (action === "share") {
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], "stats.png", { type: "image/png" })] })) {
                        try {
                            const file = new File([blob], "elite-pmba-stats.png", { type: "image/png" });
                            await navigator.share({
                                title: "Meu Desempenho - Elite PMBA",
                                text: `Estou no nível ${level?.name || "Recruta"} com ${stats.accuracy}% de acertos! Venha estudar comigo.`,
                                files: [file],
                            });
                            toast.success("Compartilhado com sucesso!");
                        } catch (err) {
                            console.error("Share error:", err);
                            // Fallback to download if share fails or is cancelled
                        }
                    } else {
                        // Fallback for desktop or unsupported browsers
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `elite-pmba-stats.png`;
                        a.click();
                        toast.info("Compartilhamento não suportado neste dispositivo. Imagem baixada!");
                    }
                }
            }, "image/png", 1.0);

        } catch (err) {
            console.error("Error generating image:", err);
            toast.error("Erro ao gerar imagem.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Button onClick={() => generateImage("share")} disabled={generating} className="gap-2 gradient-gold text-accent-foreground font-bold shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Compartilhar Conquista
            </Button>

            {/* Hidden Card for Generation */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                <div
                    ref={cardRef}
                    className="w-[1080px] h-[1920px] bg-zinc-950 text-white relative overflow-hidden flex flex-col items-center justify-between p-16 font-sans"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.15),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.15),transparent_50%)]" />
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-5" />

                    {/* Header */}
                    <div className="text-center space-y-4 z-10 mt-10">
                        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl mb-6">
                            <span className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">
                                ELITE PMBA
                            </span>
                        </div>
                        <p className="text-zinc-400 text-3xl font-medium tracking-wide uppercase">Relatório de Combate</p>
                    </div>

                    {/* User Profile */}
                    <div className="flex flex-col items-center z-10">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
                            <img
                                src={profile?.avatar_url || "https://github.com/shadcn.png"}
                                className="w-64 h-64 rounded-full border-8 border-zinc-900 shadow-2xl object-cover relative z-10"
                                alt="Avatar"
                                crossOrigin="anonymous"
                            />
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-8 py-2 rounded-full text-2xl shadow-xl z-20 whitespace-nowrap uppercase tracking-widest">
                                {level?.name || "Novato"}
                            </div>
                        </div>
                        <h2 className="text-6xl font-black mt-12 text-center text-white drop-shadow-lg max-w-2xl leading-tight">
                            {profile?.name || "Guerreiro"}
                        </h2>
                    </div>

                    {/* Stats Grid */}
                    <div className="w-full grid grid-cols-2 gap-8 z-10 px-8">
                        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                            <Target className="w-16 h-16 text-yellow-500" />
                            <span className="text-8xl font-black font-mono tracking-tighter text-white">{stats.accuracy}%</span>
                            <span className="text-2xl text-zinc-500 font-bold uppercase tracking-widest">Precisão</span>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                            <Clock className="w-16 h-16 text-blue-500" />
                            <span className="text-8xl font-black font-mono tracking-tighter text-white">{stats.hours}h</span>
                            <span className="text-2xl text-zinc-500 font-bold uppercase tracking-widest">Treinamento</span>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                            <Trophy className="w-16 h-16 text-purple-500" />
                            <span className="text-8xl font-black font-mono tracking-tighter text-white">{xp.total}</span>
                            <span className="text-2xl text-zinc-500 font-bold uppercase tracking-widest">XP Total</span>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                            <BookOpen className="w-16 h-16 text-green-500" />
                            <span className="text-8xl font-black font-mono tracking-tighter text-white">{stats.questions}</span>
                            <span className="text-2xl text-zinc-500 font-bold uppercase tracking-widest">Questões</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center z-10 mb-10 opacity-60">
                        <p className="text-2xl font-bold text-zinc-500">Junte-se à Tropa</p>
                        <p className="text-xl text-zinc-600 mt-2">elitepmba.com.br</p>
                    </div>

                </div>
            </div>
        </>
    );
}
