
-- Table to store diagnostic results for new users
CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  score NUMERIC DEFAULT 0,
  subject_scores JSONB NOT NULL DEFAULT '{}',
  weak_subjects TEXT[] DEFAULT '{}',
  strong_subjects TEXT[] DEFAULT '{}',
  recommendations JSONB DEFAULT '[]'
);

ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostic" ON public.diagnostic_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic" ON public.diagnostic_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all diagnostics" ON public.diagnostic_results
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add diagnostic_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diagnostic_completed BOOLEAN DEFAULT false;
