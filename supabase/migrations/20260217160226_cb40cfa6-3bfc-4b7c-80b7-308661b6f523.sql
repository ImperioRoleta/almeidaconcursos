
-- Allow users to delete their own progress (needed for "Recomeçar" feature)
CREATE POLICY "Users delete own progress" ON public.user_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add unique constraint for upsert on user_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_progress_user_id_lesson_id_key'
  ) THEN
    ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);
  END IF;
END $$;
