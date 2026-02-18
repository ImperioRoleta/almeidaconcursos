/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// XP rewards per activity
const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_LESSON = 25;
const XP_PER_ESSAY = 50;
const XP_PER_SIMULATION = 100;
const XP_PER_STUDY_HOUR = 20;

export interface UserXPBreakdown {
  total: number;
  fromAchievements: number;
  fromQuestions: number;
  fromLessons: number;
  fromEssays: number;
  fromSimulations: number;
  fromStudyHours: number;
}

export function useUserXP(userId: string | undefined) {
  const [xp, setXp] = useState<UserXPBreakdown>({
    total: 0, fromAchievements: 0, fromQuestions: 0,
    fromLessons: 0, fromEssays: 0, fromSimulations: 0, fromStudyHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const calc = async () => {
      const [achRes, answersRes, lessonsRes, essaysRes, simsRes, sessionsRes] = await Promise.all([
        supabase.from("user_achievements").select("achievements(xp_reward)").eq("user_id", userId),
        supabase.from("user_answers").select("is_correct").eq("user_id", userId),
        supabase.from("user_progress").select("id").eq("user_id", userId).eq("completed", true),
        supabase.from("essays").select("id").eq("user_id", userId),
        supabase.from("simulation_results").select("id").eq("user_id", userId),
        supabase.from("study_sessions").select("duration_seconds").eq("user_id", userId),
      ]);

      const fromAchievements = (achRes.data ?? []).reduce((s: number, a: any) => s + ((a as any).achievements?.xp_reward || 0), 0);
      const fromQuestions = (answersRes.data ?? []).filter((a: any) => a.is_correct).length * XP_PER_CORRECT_ANSWER;
      const fromLessons = (lessonsRes.data?.length ?? 0) * XP_PER_LESSON;
      const fromEssays = (essaysRes.data?.length ?? 0) * XP_PER_ESSAY;
      const fromSimulations = (simsRes.data?.length ?? 0) * XP_PER_SIMULATION;
      const totalSeconds = (sessionsRes.data ?? []).reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);
      const fromStudyHours = Math.floor(totalSeconds / 3600) * XP_PER_STUDY_HOUR;

      const total = fromAchievements + fromQuestions + fromLessons + fromEssays + fromSimulations + fromStudyHours;
      setXp({ total, fromAchievements, fromQuestions, fromLessons, fromEssays, fromSimulations, fromStudyHours });
      setLoading(false);
    };
    calc();
  }, [userId]);

  return { xp, loading };
}

export async function calculateUserXP(userId: string): Promise<number> {
  const [achRes, answersRes, lessonsRes, essaysRes, simsRes, sessionsRes] = await Promise.all([
    supabase.from("user_achievements").select("achievements(xp_reward)").eq("user_id", userId),
    supabase.from("user_answers").select("is_correct").eq("user_id", userId),
    supabase.from("user_progress").select("id").eq("user_id", userId).eq("completed", true),
    supabase.from("essays").select("id").eq("user_id", userId),
    supabase.from("simulation_results").select("id").eq("user_id", userId),
    supabase.from("study_sessions").select("duration_seconds").eq("user_id", userId),
  ]);
  const fromAch = (achRes.data ?? []).reduce((s: number, a: any) => s + ((a as any).achievements?.xp_reward || 0), 0);
  const fromQ = (answersRes.data ?? []).filter((a: any) => a.is_correct).length * XP_PER_CORRECT_ANSWER;
  const fromL = (lessonsRes.data?.length ?? 0) * XP_PER_LESSON;
  const fromE = (essaysRes.data?.length ?? 0) * XP_PER_ESSAY;
  const fromS = (simsRes.data?.length ?? 0) * XP_PER_SIMULATION;
  const totalSec = (sessionsRes.data ?? []).reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0);
  const fromH = Math.floor(totalSec / 3600) * XP_PER_STUDY_HOUR;
  return fromAch + fromQ + fromL + fromE + fromS + fromH;
}
