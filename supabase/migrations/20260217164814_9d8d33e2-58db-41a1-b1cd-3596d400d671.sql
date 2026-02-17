
-- 1. Add last_reset_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reset_at timestamptz DEFAULT NULL;

-- 2. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Admin reset user function
CREATE OR REPLACE FUNCTION public.admin_reset_user_data(_admin_user_id uuid, _target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão de administrador');
  END IF;

  DELETE FROM user_answers WHERE user_id = _target_user_id;
  DELETE FROM user_progress WHERE user_id = _target_user_id;
  DELETE FROM user_achievements WHERE user_id = _target_user_id;
  DELETE FROM review_queue WHERE user_id = _target_user_id;
  DELETE FROM study_sessions WHERE user_id = _target_user_id;
  DELETE FROM study_trail WHERE user_id = _target_user_id;
  DELETE FROM study_plans WHERE user_id = _target_user_id;
  DELETE FROM simulation_results WHERE user_id = _target_user_id;
  DELETE FROM simulations WHERE user_id = _target_user_id;
  DELETE FROM diagnostic_results WHERE user_id = _target_user_id;
  DELETE FROM activity_logs WHERE user_id = _target_user_id;
  DELETE FROM essays WHERE user_id = _target_user_id;

  UPDATE profiles SET level_id = 1, diagnostic_completed = false, last_reset_at = NULL WHERE user_id = _target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. User self-reset function (premium only, 1x per month)
CREATE OR REPLACE FUNCTION public.user_self_reset()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _sub record;
  _last_reset timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Check premium
  SELECT plan, status, expire_date INTO _sub FROM subscriptions WHERE user_id = _user_id;
  IF _sub.plan = 'gratuito' OR _sub.status != 'active' OR (_sub.expire_date IS NOT NULL AND _sub.expire_date < NOW()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas para assinantes premium');
  END IF;

  -- Check 30 day cooldown
  SELECT last_reset_at INTO _last_reset FROM profiles WHERE user_id = _user_id;
  IF _last_reset IS NOT NULL AND _last_reset > NOW() - INTERVAL '30 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você só pode resetar 1 vez por mês', 'next_reset', (_last_reset + INTERVAL '30 days')::text);
  END IF;

  DELETE FROM user_answers WHERE user_id = _user_id;
  DELETE FROM user_progress WHERE user_id = _user_id;
  DELETE FROM user_achievements WHERE user_id = _user_id;
  DELETE FROM review_queue WHERE user_id = _user_id;
  DELETE FROM study_sessions WHERE user_id = _user_id;
  DELETE FROM study_trail WHERE user_id = _user_id;
  DELETE FROM study_plans WHERE user_id = _user_id;
  DELETE FROM simulation_results WHERE user_id = _user_id;
  DELETE FROM simulations WHERE user_id = _user_id;
  DELETE FROM diagnostic_results WHERE user_id = _user_id;
  DELETE FROM activity_logs WHERE user_id = _user_id;
  DELETE FROM essays WHERE user_id = _user_id;

  UPDATE profiles SET level_id = 1, diagnostic_completed = false, last_reset_at = NOW() WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
