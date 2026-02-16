
-- Create admin user via auth and assign admin role
-- The trigger will auto-create profile, subscription, and user role
-- We need to manually add the admin role after
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Check if admin role already exists for this email by looking up profiles
  -- We'll handle this via a separate insert after signup
END $$;
