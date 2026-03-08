
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percentage', -- percentage | fixed
  value numeric NOT NULL DEFAULT 0,
  min_order numeric DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read active coupons by code" ON public.coupons FOR SELECT USING (is_active = true);

-- Market research settings table
CREATE TABLE public.market_research_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_provider text NOT NULL DEFAULT 'openrouter', -- openrouter | claude
  api_key_encrypted text,
  custom_prompt text DEFAULT 'סקור את השוק עבור המוצר הבא וספק: 1) מחירים של מתחרים 2) ספקי דרופשיפינג פוטנציאליים 3) המלצות מחיר',
  schedule_type text DEFAULT 'manual', -- manual | daily | weekly | monthly
  schedule_day integer DEFAULT 1, -- day of week/month
  schedule_hour integer DEFAULT 9,
  last_run_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.market_research_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage market research settings" ON public.market_research_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Market research results
CREATE TABLE public.market_research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  result_data jsonb,
  competitor_prices jsonb,
  suppliers jsonb,
  recommendation text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.market_research_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage research results" ON public.market_research_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add coupon_code to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount numeric DEFAULT 0;

-- Add more address fields to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country text DEFAULT 'ישראל';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS house_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS floor text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS apartment text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shipping_notes text;
