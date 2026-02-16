
-- Function to toggle admin role (only callable by admins)
CREATE OR REPLACE FUNCTION public.admin_toggle_role(
  _admin_user_id uuid,
  _target_user_id uuid,
  _role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_role boolean;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- Check if target already has the role
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _target_user_id AND role = _role
  ) INTO _has_role;

  IF _has_role THEN
    -- Remove role
    DELETE FROM user_roles WHERE user_id = _target_user_id AND role = _role;
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  ELSE
    -- Add role
    INSERT INTO user_roles (user_id, role) VALUES (_target_user_id, _role);
    RETURN jsonb_build_object('success', true, 'action', 'added');
  END IF;
END;
$$;

-- Function to block/unblock user account (updates subscription status AND can be checked at login)
CREATE OR REPLACE FUNCTION public.admin_block_user(
  _admin_user_id uuid,
  _target_user_id uuid,
  _block boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(_admin_user_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  UPDATE subscriptions 
  SET status = CASE WHEN _block THEN 'blocked' ELSE 'active' END
  WHERE user_id = _target_user_id;

  RETURN jsonb_build_object('success', true, 'blocked', _block);
END;
$$;
