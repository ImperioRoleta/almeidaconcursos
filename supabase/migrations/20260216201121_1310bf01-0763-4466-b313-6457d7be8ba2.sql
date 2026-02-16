
-- Add mp_payment_id to payment_requests for tracking
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS mp_status text;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS amount numeric;

-- Add mp_subscription_id to subscriptions for tracking recurring
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS mp_payment_id text;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_mp_payment_id ON public.payment_requests(mp_payment_id);
