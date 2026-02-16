
-- Create a security definer function to get leaderboard data
-- This bypasses RLS safely to aggregate public ranking info
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  total_hours numeric,
  accuracy numeric,
  streak integer,
  level_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.name,
    p.avatar_url,
    COALESCE(ROUND(SUM(ss.duration_seconds)::numeric / 3600, 1), 0) AS total_hours,
    CASE
      WHEN COUNT(ua.id) > 0 THEN ROUND((COUNT(ua.id) FILTER (WHERE ua.is_correct))::numeric / COUNT(ua.id) * 100, 0)
      ELSE 0
    END AS accuracy,
    0 AS streak,
    COALESCE(l.name, 'Recruta') AS level_name
  FROM profiles p
  LEFT JOIN study_sessions ss ON ss.user_id = p.user_id
  LEFT JOIN user_answers ua ON ua.user_id = p.user_id
  LEFT JOIN levels l ON l.id = p.level_id
  GROUP BY p.user_id, p.name, p.avatar_url, l.name
  ORDER BY total_hours DESC
  LIMIT 50;
$$;
