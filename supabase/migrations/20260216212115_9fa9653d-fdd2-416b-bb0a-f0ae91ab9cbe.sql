-- Update admin_grant_trial to use "premium_teste" instead of "trial"
CREATE OR REPLACE FUNCTION public.admin_grant_trial(_admin_user_id uuid, _target_user_ids uuid[], _duration_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _expire_date timestamptz;
  _count integer := 0;
BEGIN
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão de administrador');
  END IF;

  _expire_date := NOW() + (_duration_days || ' days')::interval;

  FOREACH _user_id IN ARRAY _target_user_ids
  LOOP
    UPDATE subscriptions SET
      plan = 'premium_teste',
      status = 'active',
      expire_date = _expire_date,
      start_date = NOW()
    WHERE user_id = _user_id;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', _count);
END;
$$;

-- Also update any existing "trial" plans to "premium_teste"
UPDATE subscriptions SET plan = 'premium_teste' WHERE plan = 'trial';
