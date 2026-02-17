
-- Add image_url to subjects for optional card images
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to topics for optional card images
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url to lessons for optional card images  
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS image_url text;

-- Add essay-related achievements
INSERT INTO public.achievements (key, name, description, category, icon, threshold, xp_reward)
VALUES
  ('first_essay', 'Primeira Redação', 'Escreveu sua primeira redação', 'essays', 'pen-line', 1, 20),
  ('essay_5', 'Escritor Dedicado', 'Escreveu 5 redações', 'essays', 'pen-line', 5, 50),
  ('essay_10', 'Autor Prolífico', 'Escreveu 10 redações', 'essays', 'pen-line', 10, 100),
  ('essay_score_800', 'Nota Exemplar', 'Obteve nota 800+ em uma redação', 'essays', 'star', 1, 80),
  ('essay_score_1000', 'Redação Perfeita', 'Obteve nota 1000 em uma redação', 'essays', 'trophy', 1, 200)
ON CONFLICT (key) DO NOTHING;
