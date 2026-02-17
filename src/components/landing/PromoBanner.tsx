import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Flame, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  valid_until: string | null;
}

function MiniCountdown({ target }: { target: Date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono font-bold">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export default function PromoBanner() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coupons")
        .select("id, code, description, discount_type, discount_value, valid_until")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const c = data[0];
        const now = new Date();
        if (c.valid_until && new Date(c.valid_until) < now) return;
        setCoupon(c);
      }
    };
    load();
  }, []);

  if (!coupon || dismissed) return null;

  const discountLabel =
    coupon.discount_type === "percentage"
      ? `${coupon.discount_value}% OFF`
      : `R$ ${coupon.discount_value.toFixed(2)} OFF`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="sticky top-0 z-[60] bg-destructive text-destructive-foreground"
      >
        <div className="container mx-auto flex items-center justify-center gap-3 py-2.5 px-4 text-sm relative">
          <Flame className="w-4 h-4 animate-pulse shrink-0" />
          <span className="font-semibold hidden sm:inline">{discountLabel}</span>
          <span className="truncate">
            Use o cupom <code className="font-mono font-bold bg-destructive-foreground/20 px-1.5 py-0.5 rounded">{coupon.code}</code>
            {coupon.description && <span className="hidden md:inline"> — {coupon.description}</span>}
          </span>
          {coupon.valid_until && (
            <span className="hidden sm:flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <MiniCountdown target={new Date(coupon.valid_until)} />
            </span>
          )}
          <Link
            to="/cadastro"
            className="shrink-0 bg-destructive-foreground text-destructive font-bold text-xs px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
          >
            Aproveitar
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
