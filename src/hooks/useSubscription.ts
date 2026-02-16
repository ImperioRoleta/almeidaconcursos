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
  const isPremium = subscription?.plan !== "gratuito" && subscription?.plan !== "trial" && subscription?.status === "active" && !isExpired;
  const isTrial = subscription?.plan === "trial" && subscription?.status === "active" && !isExpired;
  const isActive = (isPremium || isTrial) && !isExpired;

  return { subscription, isPremium, isTrial, isExpired, isActive, loading };
}
