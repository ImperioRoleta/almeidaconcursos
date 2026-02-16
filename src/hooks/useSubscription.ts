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

  const isPremium = subscription?.plan !== "gratuito" && subscription?.status === "active";
  const isExpired = subscription?.expire_date && new Date(subscription.expire_date) < new Date();
  const isActive = subscription?.status === "active" && !isExpired;

  return { subscription, isPremium, isExpired, isActive, loading };
}
