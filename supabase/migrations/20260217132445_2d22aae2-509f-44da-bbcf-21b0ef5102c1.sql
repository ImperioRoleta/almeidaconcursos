
-- Spaced Repetition Review Queue
CREATE TABLE public.review_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'wrong_answer', -- 'wrong_answer', 'lesson_review', 'manual'
  interval_days integer NOT NULL DEFAULT 1,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_at timestamp with time zone NOT NULL DEFAULT now(),
  last_reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON public.review_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.review_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.review_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.review_queue FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all reviews" ON public.review_queue FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Study trail progress tracking
CREATE TABLE public.study_trail (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'lesson', -- 'lesson', 'questions', 'review', 'simulation', 'completed'
  lessons_done integer NOT NULL DEFAULT 0,
  questions_done integer NOT NULL DEFAULT 0,
  review_done boolean NOT NULL DEFAULT false,
  simulation_done boolean NOT NULL DEFAULT false,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(user_id, subject_id)
);

ALTER TABLE public.study_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trail" ON public.study_trail FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trail" ON public.study_trail FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trail" ON public.study_trail FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all trails" ON public.study_trail FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
