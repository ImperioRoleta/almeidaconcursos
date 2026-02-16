
-- Achievements definition table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  threshold integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements readable" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User achievements tracking
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all achievements" ON public.user_achievements FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Seed achievements
INSERT INTO public.achievements (key, name, description, icon, category, threshold, xp_reward) VALUES
  ('questions_10', 'Primeiros Passos', 'Responda 10 questões', 'target', 'questoes', 10, 10),
  ('questions_50', 'Praticante', 'Responda 50 questões', 'target', 'questoes', 50, 25),
  ('questions_100', 'Centurião', 'Responda 100 questões', 'target', 'questoes', 100, 50),
  ('questions_500', 'Mestre das Questões', 'Responda 500 questões', 'target', 'questoes', 500, 100),
  ('hours_1', 'Dedicação Inicial', 'Estude por 1 hora', 'clock', 'estudo', 1, 10),
  ('hours_5', 'Estudante Focado', 'Estude por 5 horas', 'clock', 'estudo', 5, 25),
  ('hours_10', 'Maratonista', 'Estude por 10 horas', 'clock', 'estudo', 10, 50),
  ('hours_50', 'Veterano', 'Estude por 50 horas', 'clock', 'estudo', 50, 100),
  ('accuracy_70', 'Bom Desempenho', 'Alcance 70% de acerto', 'check-circle', 'desempenho', 70, 25),
  ('accuracy_90', 'Excelência', 'Alcance 90% de acerto', 'award', 'desempenho', 90, 50),
  ('streak_3', 'Constância', 'Estude 3 dias seguidos', 'flame', 'streak', 3, 15),
  ('streak_7', 'Semana Perfeita', 'Estude 7 dias seguidos', 'flame', 'streak', 7, 30),
  ('streak_30', 'Imparável', 'Estude 30 dias seguidos', 'flame', 'streak', 30, 100),
  ('simulation_1', 'Primeiro Simulado', 'Complete 1 simulado', 'file-text', 'simulados', 1, 15),
  ('simulation_5', 'Simulador', 'Complete 5 simulados', 'file-text', 'simulados', 5, 30);
