import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Clock, X, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EXPIRATION_MINUTES = 30;

export default function PendingCheckoutBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPending = async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const req = data[0];
        const createdAt = new Date(req.created_at).getTime();
        const expiresAt = createdAt + EXPIRATION_MINUTES * 60 * 1000;
        const remaining = expiresAt - Date.now();

        if (remaining > 0) {
          setPendingRequest(req);
          setTimeLeft(Math.floor(remaining / 1000));
        }
      }
    };

    fetchPending();
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || !pendingRequest) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPendingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingRequest, timeLeft]);

  if (!pendingRequest || dismissed || timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 300; // < 5 min

  const planLabels: Record<string, string> = {
    premium_mensal: "Premium Mensal",
    premium_anual: "Premium Anual",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[420px] z-50"
      >
        <Card className={`shadow-2xl border-2 ${isUrgent ? "border-destructive/50 bg-destructive/5" : "border-primary/30 bg-background"}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <ShoppingCart className={`w-5 h-5 ${isUrgent ? "text-destructive" : "text-primary"}`} />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm">Finalize sua compra!</p>
                  <p className="text-xs text-muted-foreground">
                    {planLabels[pendingRequest.plan] || pendingRequest.plan}
                    {pendingRequest.amount && (
                      <span className="ml-1 font-semibold text-foreground">
                        R$ {Number(pendingRequest.amount).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDismissed(true)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mt-3 gap-3">
              <div className="flex items-center gap-2">
                {isUrgent ? (
                  <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge variant="outline" className={`font-mono text-xs ${isUrgent ? "border-destructive/30 text-destructive" : ""}`}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </Badge>
                <span className="text-[11px] text-muted-foreground">restantes</span>
              </div>
              <Button
                size="sm"
                className={isUrgent ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "gradient-primary text-primary-foreground"}
                onClick={() => navigate("/assinatura")}
              >
                Finalizar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
