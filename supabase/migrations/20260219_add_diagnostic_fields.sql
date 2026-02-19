ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS diagnostic_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS diagnostic_data JSONB DEFAULT '{}'::jsonb;
