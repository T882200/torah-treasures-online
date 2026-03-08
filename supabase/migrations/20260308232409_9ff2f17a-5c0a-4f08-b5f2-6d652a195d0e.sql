
-- Font management
CREATE TABLE public.site_fonts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  family_name text NOT NULL,
  source text NOT NULL DEFAULT 'google',
  google_url text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role)
);

CREATE TABLE public.custom_font_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  font_id uuid REFERENCES public.site_fonts(id) ON DELETE CASCADE NOT NULL,
  weight integer NOT NULL DEFAULT 400,
  style text NOT NULL DEFAULT 'normal',
  file_url text NOT NULL
);

-- Promo banners
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  link_url text,
  image_url text,
  bg_color text DEFAULT '#1a2744',
  text_color text DEFAULT '#f5f0e8',
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Product badges
CREATE TABLE public.product_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  image_url text,
  label text,
  bg_color text DEFAULT '#d4a017',
  text_color text DEFAULT '#ffffff',
  corner text DEFAULT 'top-right',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_badge_assignments (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES public.product_badges(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, badge_id)
);

-- Homepage sections
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text,
  config jsonb DEFAULT '{}',
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.site_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_font_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_badge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Site fonts are publicly readable" ON public.site_fonts FOR SELECT USING (true);
CREATE POLICY "Custom font files are publicly readable" ON public.custom_font_files FOR SELECT USING (true);
CREATE POLICY "Active banners are publicly readable" ON public.promo_banners FOR SELECT USING (is_active = true);
CREATE POLICY "Active badges are publicly readable" ON public.product_badges FOR SELECT USING (is_active = true);
CREATE POLICY "Badge assignments are publicly readable" ON public.product_badge_assignments FOR SELECT USING (true);
CREATE POLICY "Homepage sections publicly readable" ON public.homepage_sections FOR SELECT USING (is_active = true);

-- Admin manage policies
CREATE POLICY "Admins can manage site fonts" ON public.site_fonts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage custom font files" ON public.custom_font_files FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage promo banners" ON public.promo_banners FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage product badges" ON public.product_badges FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage badge assignments" ON public.product_badge_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage homepage sections" ON public.homepage_sections FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-fonts', 'custom-fonts', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('badges', 'badges', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Storage policies
CREATE POLICY "Public read custom-fonts" ON storage.objects FOR SELECT USING (bucket_id = 'custom-fonts');
CREATE POLICY "Admin manage custom-fonts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'custom-fonts' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update custom-fonts" ON storage.objects FOR UPDATE USING (bucket_id = 'custom-fonts' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete custom-fonts" ON storage.objects FOR DELETE USING (bucket_id = 'custom-fonts' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read badges" ON storage.objects FOR SELECT USING (bucket_id = 'badges');
CREATE POLICY "Admin manage badges-storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'badges' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update badges-storage" ON storage.objects FOR UPDATE USING (bucket_id = 'badges' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete badges-storage" ON storage.objects FOR DELETE USING (bucket_id = 'badges' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admin manage banners-storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update banners-storage" ON storage.objects FOR UPDATE USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete banners-storage" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'));

-- Seed default fonts
INSERT INTO public.site_fonts (role, family_name, source, google_url) VALUES
  ('display', 'Frank Ruhl Libre', 'google', 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700;900&display=swap'),
  ('body', 'Heebo', 'google', 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');

-- Seed default homepage sections
INSERT INTO public.homepage_sections (type, title, config, position, is_active) VALUES
  ('hero', 'באנר ראשי', '{"heading":"עולם של ספרות קודש","subheading":"אלפי ספרי תורה, הלכה, מוסר וחסידות במקום אחד","cta_text":"חדשים בחנות","cta_link":"/category/new","cta2_text":"רבי מכר","cta2_link":"/category/bestsellers"}'::jsonb, 0, true),
  ('categories', 'קטגוריות', '{}'::jsonb, 1, true),
  ('product_carousel', 'חדשים בחנות', '{"query_type":"new_arrivals","limit":8}'::jsonb, 2, true),
  ('promo_banner', 'משלוח חינם', '{"heading":"משלוח חינם מעל ₪200","subheading":"לכל רחבי הארץ • משלוח תוך 3-5 ימי עסקים"}'::jsonb, 3, true),
  ('product_carousel', 'רבי מכר', '{"query_type":"best_sellers","limit":8}'::jsonb, 4, true),
  ('newsletter', 'ניוזלטר', '{}'::jsonb, 5, true);
