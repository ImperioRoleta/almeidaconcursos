
-- Platform settings for storing payment config, links, etc.
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Settings readable by authenticated" ON public.platform_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed payment settings
INSERT INTO public.platform_settings (key, value, label, category) VALUES
  ('mp_pix_key', '', 'Chave PIX (Mercado Pago)', 'pagamento'),
  ('mp_pix_name', '', 'Nome do titular PIX', 'pagamento'),
  ('mp_payment_link_mensal', '', 'Link de pagamento Mensal (Mercado Pago)', 'pagamento'),
  ('mp_payment_link_anual', '', 'Link de pagamento Anual (Mercado Pago)', 'pagamento'),
  ('mp_whatsapp', '', 'WhatsApp para suporte/pagamento', 'pagamento'),
  ('mp_instructions', 'Após efetuar o pagamento, envie o comprovante via WhatsApp para liberação do acesso.', 'Instruções de pagamento', 'pagamento'),
  ('plan_price_mensal', '39.90', 'Preço Premium Mensal (R$)', 'planos'),
  ('plan_price_anual', '29.90', 'Preço Premium Anual (R$/mês)', 'planos'),
  ('plan_price_anual_total', '358.80', 'Preço Premium Anual Total (R$)', 'planos');

-- Payment requests table (student requests upgrade, admin approves)
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'premium_mensal',
  status text NOT NULL DEFAULT 'pending',
  proof_info text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage requests" ON public.payment_requests FOR ALL USING (has_role(auth.uid(), 'admin'));
