-- Remove the overly permissive coupon read policy
DROP POLICY IF EXISTS "Authenticated read active coupons" ON public.coupons;

-- Coupons are validated server-side in mp-create-preference using service_role key.
-- No client-side read access needed. Only admins manage coupons.
