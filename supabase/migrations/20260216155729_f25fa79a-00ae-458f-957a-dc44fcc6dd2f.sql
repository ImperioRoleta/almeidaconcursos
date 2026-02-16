
-- 1. Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. User roles table (FIRST, so has_role can exist)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function (BEFORE any policy uses it)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Levels table
CREATE TABLE public.levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  min_accuracy NUMERIC DEFAULT 0,
  min_hours NUMERIC DEFAULT 0,
  rank_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.levels (name, min_accuracy, min_hours, rank_order) VALUES
  ('Recruta', 0, 0, 1),
  ('Soldado em Formação', 30, 5, 2),
  ('Soldado Operacional', 50, 15, 3),
  ('Cabo Acadêmico', 65, 30, 4),
  ('Sargento de Elite', 80, 60, 5),
  ('Oficial de Mérito', 90, 100, 6);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels readable" ON public.levels FOR SELECT TO authenticated USING (true);

-- 5. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  level_id INT REFERENCES public.levels(id) DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'gratuito' CHECK (plan IN ('gratuito', 'premium_mensal', 'premium_anual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sub" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subs" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects readable" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Topics
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics readable" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage topics" ON public.topics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  order_index INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons readable" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  statement TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions readable" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11. Question options
CREATE TABLE public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Options readable" ON public.question_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage options" ON public.question_options FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 12. User answers
CREATE TABLE public.user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own answers" ON public.user_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own answers" ON public.user_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all answers" ON public.user_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13. User progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all progress" ON public.user_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 14. Study sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.study_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 15. Simulations
CREATE TABLE public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Simulado',
  total_questions INT NOT NULL DEFAULT 0,
  time_limit_minutes INT DEFAULT 120,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own simulations" ON public.simulations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own simulations" ON public.simulations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own simulations" ON public.simulations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all simulations" ON public.simulations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 16. Simulation results
CREATE TABLE public.simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES public.simulations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC DEFAULT 0,
  total_correct INT DEFAULT 0,
  total_wrong INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own results" ON public.simulation_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own results" ON public.simulation_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all results" ON public.simulation_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 17. Activity logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 18. Auto-create profile + role + subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 19. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 20. Seed subjects
INSERT INTO public.subjects (name, description, icon, order_index) VALUES
  ('Língua Portuguesa', 'Gramática, interpretação de texto e redação', 'BookOpen', 1),
  ('Direito Constitucional', 'Constituição Federal e direitos fundamentais', 'Scale', 2),
  ('Direito Penal', 'Código Penal e legislação penal especial', 'Gavel', 3),
  ('Direito Administrativo', 'Administração pública e atos administrativos', 'Building', 4),
  ('Legislação PM', 'Estatuto e regulamento da PMBA', 'Shield', 5),
  ('Direitos Humanos', 'Declarações e tratados de direitos humanos', 'Heart', 6),
  ('Raciocínio Lógico', 'Lógica proposicional e matemática', 'Brain', 7),
  ('Informática', 'Conceitos básicos e segurança da informação', 'Monitor', 8);

-- 21. Seed topics
DO $$
DECLARE
  s_id UUID;
BEGIN
  SELECT id INTO s_id FROM public.subjects WHERE name = 'Língua Portuguesa';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Interpretação de Texto', 1), (s_id, 'Gramática', 2), (s_id, 'Ortografia', 3);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Direito Constitucional';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Princípios Fundamentais', 1), (s_id, 'Direitos e Garantias', 2), (s_id, 'Organização do Estado', 3);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Direito Penal';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Parte Geral', 1), (s_id, 'Crimes contra a Pessoa', 2), (s_id, 'Crimes contra o Patrimônio', 3);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Direito Administrativo';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Princípios Administrativos', 1), (s_id, 'Atos Administrativos', 2), (s_id, 'Servidores Públicos', 3);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Legislação PM';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Estatuto da PMBA', 1), (s_id, 'Regulamento Disciplinar', 2);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Direitos Humanos';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Declaração Universal', 1), (s_id, 'Tratados Internacionais', 2);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Raciocínio Lógico';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Proposições Lógicas', 1), (s_id, 'Sequências e Padrões', 2);

  SELECT id INTO s_id FROM public.subjects WHERE name = 'Informática';
  INSERT INTO public.topics (subject_id, name, order_index) VALUES
    (s_id, 'Hardware e Software', 1), (s_id, 'Segurança da Informação', 2);
END $$;
