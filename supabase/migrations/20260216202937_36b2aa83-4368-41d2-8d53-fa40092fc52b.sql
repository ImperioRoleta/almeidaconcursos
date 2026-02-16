
-- Admin function to grant subscription to users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  _admin_user_id uuid,
  _target_user_ids uuid[],
  _plan text,
  _duration_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _expire_date timestamptz;
  _existing_expire timestamptz;
  _count integer := 0;
BEGIN
  -- Verify admin
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  FOREACH _user_id IN ARRAY _target_user_ids
  LOOP
    -- Check existing subscription expiration
    SELECT expire_date INTO _existing_expire
    FROM subscriptions WHERE user_id = _user_id;

    -- If active subscription, extend from current expiration
    IF _existing_expire IS NOT NULL AND _existing_expire > NOW() THEN
      _expire_date := _existing_expire + (_duration_days || ' days')::interval;
    ELSE
      _expire_date := NOW() + (_duration_days || ' days')::interval;
    END IF;

    UPDATE subscriptions SET
      plan = _plan,
      status = 'active',
      expire_date = _expire_date,
      start_date = NOW()
    WHERE user_id = _user_id;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', _count);
END;
$$;

-- Admin function to grant free trial
CREATE OR REPLACE FUNCTION public.admin_grant_trial(
  _admin_user_id uuid,
  _target_user_ids uuid[],
  _duration_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _expire_date timestamptz;
  _count integer := 0;
BEGIN
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  _expire_date := NOW() + (_duration_days || ' days')::interval;

  FOREACH _user_id IN ARRAY _target_user_ids
  LOOP
    UPDATE subscriptions SET
      plan = 'trial',
      status = 'active',
      expire_date = _expire_date,
      start_date = NOW()
    WHERE user_id = _user_id;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', _count);
END;
$$;
