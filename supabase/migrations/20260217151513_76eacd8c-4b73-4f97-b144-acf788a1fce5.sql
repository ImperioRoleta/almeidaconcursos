
-- Add video_url to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_url text;

-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-videos
CREATE POLICY "Anyone can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

CREATE POLICY "Admins can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lesson videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'));

-- Essay themes table (daily AI-generated themes)
CREATE TABLE public.essay_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  motivating_texts jsonb DEFAULT '[]'::jsonb,
  genre text NOT NULL DEFAULT 'dissertativo-argumentativo',
  active_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'ai'
);

ALTER TABLE public.essay_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Essay themes readable by authenticated"
ON public.essay_themes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage essay themes"
ON public.essay_themes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Essays table (user submissions + AI corrections)
CREATE TABLE public.essays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  theme_id uuid REFERENCES public.essay_themes(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  score numeric,
  correction jsonb,
  corrected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own essays"
ON public.essays FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own essays"
ON public.essays FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own essays"
ON public.essays FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage essays"
ON public.essays FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_essays_updated_at
BEFORE UPDATE ON public.essays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform settings for feature toggles
INSERT INTO public.platform_settings (key, value, category, label) VALUES
('video_lessons_enabled', 'true', 'features', 'Vídeo-aulas habilitadas'),
('tts_enabled', 'true', 'features', 'Ouvir aula (TTS) habilitado'),
('essays_enabled', 'true', 'features', 'Redações habilitadas')
ON CONFLICT (key) DO NOTHING;
