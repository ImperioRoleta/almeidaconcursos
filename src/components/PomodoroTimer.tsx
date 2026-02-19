import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Coffee, Play, Pause, RotateCcw, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function PomodoroTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<"work" | "break">("work");
    const [minimized, setMinimized] = useState(true);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = useCallback(() => {
        setIsActive(false);
        setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
    }, [mode]);

    const switchMode = () => {
        const nextMode = mode === "work" ? "break" : "work";
        setMode(nextMode);
        setTimeLeft(nextMode === "work" ? 25 * 60 : 5 * 60);
        setIsActive(false);
        toast.info(nextMode === "work" ? "Hora de focar! 🚀" : "Hora do descanso! ☕");
    };

    useEffect(() => {
        let interval;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Play a subtle sound or use notification here
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
            switchMode();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = (timeLeft / (mode === "work" ? 25 * 60 : 5 * 60)) * 100;

    if (minimized) {
        return (
            <motion.button
                layoutId="pomodoro"
                onClick={() => setMinimized(false)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            >
                <Timer className="w-6 h-6 text-white" />
                {isActive && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-background animate-pulse" />
                )}
            </motion.button>
        );
    }

    return (
        <motion.div
            layoutId="pomodoro"
            className="fixed bottom-6 right-6 z-50 w-72 glass-card p-6 shadow-2xl border-primary/20 flex flex-col items-center gap-4"
        >
            <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pomodoro Pro</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setMinimized(true)}>
                    <X className="w-3 h-3" />
                </Button>
            </div>

            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted/20"
                    />
                    <motion.circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="377"
                        initial={{ strokeDashoffset: 377 }}
                        animate={{ strokeDashoffset: 377 - (377 * (100 - progress)) / 100 }}
                        className={mode === "work" ? "text-primary" : "text-[hsl(var(--chart-4))]"}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-mono font-bold">{formatTime(timeLeft)}</p>
                    <p className="text-[10px] uppercase tracking-tighter opacity-70">
                        {mode === "work" ? "Focar" : "Descansar"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full">
                <Button
                    onClick={toggleTimer}
                    className="flex-1 gradient-primary text-white font-bold h-10 shadow-lg"
                >
                    {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isActive ? "Pausar" : "Iniciar"}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={resetTimer}
                    className="h-10 w-10 border-border/50"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex gap-2 w-full pt-2 border-t border-border/30">
                <button
                    onClick={() => { setMode("work"); setTimeLeft(25 * 60); setIsActive(false); }}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${mode === "work" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50"
                        }`}
                >
                    Foco
                </button>
                <button
                    onClick={() => { setMode("break"); setTimeLeft(5 * 60); setIsActive(false); }}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${mode === "break" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "text-muted-foreground hover:bg-muted/50"
                        }`}
                >
                    Pausa
                </button>
            </div>
        </motion.div>
    );
}
