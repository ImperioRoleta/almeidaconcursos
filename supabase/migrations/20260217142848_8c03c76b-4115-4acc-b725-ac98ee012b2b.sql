
-- Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  billing_period text NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  badge_text text,
  color text DEFAULT 'hsl(217, 99%, 50%)',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  applicable_plans text[] DEFAULT '{}'::text[],
  min_amount numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Plans: readable by all, managed by admins
CREATE POLICY "Plans readable" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Coupons: admins manage, authenticated can read active
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read active coupons" ON public.coupons FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Storage bucket for plan images
INSERT INTO storage.buckets (id, name, public) VALUES ('plan-images', 'plan-images', true);
CREATE POLICY "Plan images public read" ON storage.objects FOR SELECT USING (bucket_id = 'plan-images');
CREATE POLICY "Admins upload plan images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'plan-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update plan images" ON storage.objects FOR UPDATE USING (bucket_id = 'plan-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete plan images" ON storage.objects FOR DELETE USING (bucket_id = 'plan-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.plans (name, slug, description, price, billing_period, features, is_active, is_featured, order_index, badge_text, color) VALUES
('Gratuito', 'gratuito', 'Comece sua jornada de estudos', 0, 'free', '["Acesso a aulas básicas", "5 questões por dia", "Trilha de estudos básica"]'::jsonb, true, false, 0, null, 'hsl(var(--muted-foreground))'),
('Premium Mensal', 'premium_mensal', 'Acesso completo à plataforma', 39.90, 'monthly', '["Acesso ilimitado a todas as aulas", "Questões ilimitadas", "Simulados completos", "Tutor IA personalizado", "Plano de estudos com IA", "Revisão espaçada inteligente"]'::jsonb, true, true, 1, 'Mais Popular', 'hsl(217, 99%, 50%)'),
('Premium Anual', 'premium_anual', 'Melhor custo-benefício', 29.90, 'annual', '["Tudo do plano mensal", "Economia de 25%", "Suporte prioritário", "Acesso antecipado a novidades", "Certificados de conclusão"]'::jsonb, true, false, 2, 'Melhor Custo', 'hsl(43, 76%, 53%)');
