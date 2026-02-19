import { useAuth } from "@/contexts/AuthContext";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSubscription() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSub = async () => {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mounted) {
          if (error) {
            console.error("Supabase error in useSubscription:", error);
            setSubscription(null);
          } else {
            setSubscription(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error("Unexpected error in useSubscription:", err);
          setSubscription(null);
          setLoading(false);
        }
      }
    };

    fetchSub();

    return () => { mounted = false; };
  }, [user]);

  const isExpired = subscription?.expire_date ? new Date(subscription.expire_date) < new Date() : false;
  const isPremiumSub = subscription?.plan !== "gratuito" && subscription?.plan !== "premium_teste" && subscription?.status === "active" && !isExpired;
  const isTrial = subscription?.plan === "premium_teste" && subscription?.status === "active" && !isExpired;

  // Admins and Teachers have full access regardless of subscription
  const isPremium = isPremiumSub || isAdmin || isTeacher;
  const isActive = isPremium || isTrial;

  const planLabel = isAdmin ? "Administrador" : isTeacher ? "Professor" : subscription?.plan === "premium_teste" ? "Premium Teste"
    : subscription?.plan === "premium_mensal" ? "Premium Mensal"
      : subscription?.plan === "premium_anual" ? "Premium Anual"
        : "Gratuito";

  const daysLeft = subscription?.expire_date
    ? Math.max(0, Math.ceil((new Date(subscription.expire_date).getTime() - Date.now()) / 86400000))
    : null;

  // Feature Gates
  const canUsePomodoro = isActive;
  const canUseFlashcards = isActive;
  const canAccessFullLessons = isActive;
  const canGetAiRedacao = isActive;
  const questionLimit = isActive ? -1 : 10; // -1 for unlimited

  return {
    subscription, isPremium, isTrial, isExpired, isActive,
    loading, planLabel, daysLeft,
    canUsePomodoro, canUseFlashcards, canAccessFullLessons,
    canGetAiRedacao, questionLimit
  };
}
