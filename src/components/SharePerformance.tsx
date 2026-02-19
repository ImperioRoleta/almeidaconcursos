import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Share2, Loader2 } from "lucide-react";
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

    const generateImage = async () => {
        if (!cardRef.current) return;
        setGenerating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: "#000000",
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) { toast.error("Erro ao gerar imagem."); setGenerating(false); return; }

                const file = new File([blob], "elite-pmba-conquista.png", { type: "image/png" });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: "Meu Desempenho Elite PMBA",
                            text: `🎖️ ${stats.accuracy}% de precisão, ${xp.total} XP — Elite PMBA me preparando pro concurso!`,
                            files: [file],
                        });
                        toast.success("Compartilhado com sucesso!");
                    } catch (e) {
                        // user cancelled — do nothing
                    }
                } else {
                    // Desktop fallback: download
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "elite-pmba-conquista.png";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Imagem baixada! Compartilhe nas redes sociais.");
                }
                setGenerating(false);
            }, "image/png", 1.0);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao gerar imagem.");
            setGenerating(false);
        }
    };

    const initials = (profile?.name || "Guerreiro").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <>
            <Button
                onClick={generateImage}
                disabled={generating}
                className="gap-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 text-black font-black text-sm shadow-xl shadow-yellow-500/30 hover:shadow-yellow-500/50 hover:scale-105 transition-all duration-300 px-6 h-11 rounded-2xl"
            >
                {generating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    : <><Share2 className="w-4 h-4" /> Compartilhar Conquista</>
                }
            </Button>

            {/* ===== OFF-SCREEN CARD FOR html2canvas ===== */}
            <div style={{ position: "fixed", top: "-9999px", left: "-9999px", zIndex: -1, pointerEvents: "none" }}>
                <div
                    ref={cardRef}
                    style={{
                        width: "1080px",
                        height: "1920px",
                        background: "linear-gradient(135deg, #0a0a0a 0%, #0f0c1e 40%, #0a0a0a 100%)",
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontFamily: "'Arial Black', 'Arial', sans-serif",
                    }}
                >
                    {/* === BACKGROUND GLOWS === */}
                    <div style={{
                        position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)",
                        width: "900px", height: "900px", borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(234,179,8,0.18) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", bottom: "0px", left: "50%", transform: "translateX(-50%)",
                        width: "800px", height: "800px", borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />

                    {/* === TOP DECORATIVE STRIPE === */}
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "8px",
                        background: "linear-gradient(90deg, #ca8a04, #eab308, #fde047, #eab308, #ca8a04)",
                    }} />

                    {/* === DIAGONAL ACCENT LINES === */}
                    <div style={{
                        position: "absolute", top: 0, right: 0, width: "400px", height: "400px",
                        background: "linear-gradient(135deg, rgba(234,179,8,0.08) 0%, transparent 60%)",
                        clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                        pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", bottom: 0, left: 0, width: "400px", height: "400px",
                        background: "linear-gradient(315deg, rgba(59,130,246,0.08) 0%, transparent 60%)",
                        clipPath: "polygon(0 100%, 0 0, 100% 100%)",
                        pointerEvents: "none",
                    }} />

                    {/* === LOGO / BRAND TOP === */}
                    <div style={{
                        marginTop: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                    }}>
                        <div style={{
                            background: "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))",
                            border: "1px solid rgba(234,179,8,0.3)",
                            borderRadius: "20px",
                            padding: "16px 40px",
                            backdropFilter: "blur(20px)",
                        }}>
                            <span style={{
                                fontSize: "36px", fontWeight: "900", letterSpacing: "8px",
                                background: "linear-gradient(90deg, #ca8a04, #eab308, #fde047)",
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                textTransform: "uppercase",
                            }}>
                                🎖 ELITE PMBA
                            </span>
                        </div>
                        <span style={{
                            fontSize: "22px", color: "rgba(253,224,71,0.6)", letterSpacing: "6px",
                            textTransform: "uppercase", fontWeight: "700",
                        }}>
                            RELATÓRIO DE COMBATE
                        </span>
                    </div>

                    {/* === AVATAR SECTION === */}
                    <div style={{ marginTop: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0px" }}>
                        {/* Outer ring glow */}
                        <div style={{
                            width: "280px", height: "280px", borderRadius: "50%",
                            background: "conic-gradient(from 0deg, #ca8a04, #eab308, #fde047, #eab308, #ca8a04)",
                            padding: "5px",
                            boxShadow: "0 0 60px rgba(234,179,8,0.6), 0 0 120px rgba(234,179,8,0.2)",
                            position: "relative",
                        }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0a0a0a", padding: "5px" }}>
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                                        crossOrigin="anonymous"
                                        alt="avatar"
                                    />
                                ) : (
                                    <div style={{
                                        width: "100%", height: "100%", borderRadius: "50%",
                                        background: "linear-gradient(135deg, #1e40af, #7c3aed)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "80px", fontWeight: "900", color: "white",
                                    }}>
                                        {initials}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rank badge below avatar */}
                        <div style={{
                            marginTop: "24px",
                            background: "linear-gradient(135deg, #ca8a04, #eab308)",
                            borderRadius: "100px",
                            padding: "10px 40px",
                            boxShadow: "0 8px 32px rgba(234,179,8,0.5)",
                        }}>
                            <span style={{
                                color: "#000", fontWeight: "900", fontSize: "24px", letterSpacing: "4px",
                                textTransform: "uppercase",
                            }}>
                                {level?.name || "RECRUTA"}
                            </span>
                        </div>
                    </div>

                    {/* === USER NAME === */}
                    <div style={{ marginTop: "40px", textAlign: "center", padding: "0 80px" }}>
                        <h1 style={{
                            fontSize: "72px",
                            fontWeight: "900",
                            color: "white",
                            letterSpacing: "-2px",
                            lineHeight: "1",
                            textShadow: "0 4px 30px rgba(234,179,8,0.3)",
                            margin: 0,
                        }}>
                            {profile?.name || "GUERREIRO"}
                        </h1>
                        <p style={{
                            color: "rgba(255,255,255,0.3)", fontSize: "24px", marginTop: "12px",
                            letterSpacing: "4px", textTransform: "uppercase", fontWeight: "700",
                        }}>
                            em treinamento para SD PMBA
                        </p>
                    </div>

                    {/* === DIVIDER === */}
                    <div style={{
                        marginTop: "60px", width: "880px", height: "1px",
                        background: "linear-gradient(90deg, transparent, rgba(234,179,8,0.5), transparent)",
                    }} />

                    {/* === XP HIGHLIGHT === */}
                    <div style={{
                        marginTop: "48px", textAlign: "center",
                        background: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.03))",
                        border: "1px solid rgba(234,179,8,0.2)",
                        borderRadius: "32px",
                        padding: "32px 80px",
                        width: "880px",
                    }}>
                        <div style={{
                            fontSize: "120px", fontWeight: "900", lineHeight: "1",
                            background: "linear-gradient(180deg, #fde047, #ca8a04)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            filter: "drop-shadow(0 0 30px rgba(234,179,8,0.4))",
                        }}>
                            {xp.total.toLocaleString("pt-BR")}
                        </div>
                        <div style={{ color: "rgba(253,224,71,0.6)", fontSize: "28px", letterSpacing: "8px", fontWeight: "700", marginTop: "8px" }}>
                            XP ACUMULADO
                        </div>
                    </div>

                    {/* === STATS ROW === */}
                    <div style={{
                        marginTop: "48px", display: "grid", gridTemplateColumns: "1fr 1fr",
                        gap: "24px", width: "880px",
                    }}>
                        {[
                            { label: "PRECISÃO", value: `${stats.accuracy}%`, icon: "🎯", color: "#f59e0b" },
                            { label: "HORAS", value: `${stats.hours}h`, icon: "⏱️", color: "#3b82f6" },
                            { label: "QUESTÕES", value: stats.questions.toLocaleString("pt-BR"), icon: "📝", color: "#8b5cf6" },
                            { label: "SEQUÊNCIA", value: `${stats.streak}d`, icon: "🔥", color: "#ef4444" },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "28px",
                                padding: "32px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "12px",
                                backdropFilter: "blur(10px)",
                            }}>
                                <div style={{ fontSize: "48px" }}>{s.icon}</div>
                                <div style={{
                                    fontSize: "64px", fontWeight: "900", lineHeight: "1",
                                    color: s.color, textShadow: `0 0 30px ${s.color}66`,
                                }}>
                                    {s.value}
                                </div>
                                <div style={{
                                    color: "rgba(255,255,255,0.35)", fontSize: "20px", letterSpacing: "5px",
                                    fontWeight: "700", textTransform: "uppercase",
                                }}>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* === BOTTOM CTA === */}
                    <div style={{
                        marginTop: "auto",
                        marginBottom: "80px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        padding: "32px 80px",
                        borderTop: "1px solid rgba(234,179,8,0.15)",
                        width: "1080px",
                    }}>
                        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "22px", fontWeight: "700", letterSpacing: "4px", margin: 0 }}>
                            JUNTE-SE AO BATALHÃO
                        </p>
                        <p style={{
                            fontSize: "32px", fontWeight: "900", letterSpacing: "2px", margin: 0,
                            background: "linear-gradient(90deg, #eab308, #fde047)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>
                            elitepmba.com.br
                        </p>
                    </div>

                    {/* === BOTTOM STRIPE === */}
                    <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: "6px",
                        background: "linear-gradient(90deg, #1e40af, #3b82f6, #1e40af)",
                    }} />
                </div>
            </div>
        </>
    );
}
