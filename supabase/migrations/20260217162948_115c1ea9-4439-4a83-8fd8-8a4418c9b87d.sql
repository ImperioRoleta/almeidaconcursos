CREATE POLICY "Users delete own answers"
  ON public.user_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);