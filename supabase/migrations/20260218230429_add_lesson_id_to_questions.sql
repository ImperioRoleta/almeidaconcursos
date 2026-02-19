ALTER TABLE public.questions 
ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Optional: Index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON public.questions(lesson_id);
