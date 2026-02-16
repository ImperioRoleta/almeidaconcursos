import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("subscriptions").select("*").eq("user_id", user.id).single()
      .then(({ data }) => { setSubscription(data); setLoading(false); });
  }, [user]);

  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const isPremium = subscription?.plan !== "gratuito" && subscription?.plan !== "premium_teste" && subscription?.status === "active" && !isExpired;
  const isTrial = subscription?.plan === "premium_teste" && subscription?.status === "active" && !isExpired;
  const isActive = (isPremium || isTrial) && !isExpired;
  const planLabel = subscription?.plan === "premium_teste" ? "Premium Teste"
    : subscription?.plan === "premium_mensal" ? "Premium Mensal"
    : subscription?.plan === "premium_anual" ? "Premium Anual"
    : "Gratuito";
  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / 86400000))
    : null;

  return { subscription, isPremium, isTrial, isExpired, isActive, loading, planLabel, daysLeft };
}
