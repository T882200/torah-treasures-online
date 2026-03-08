
-- STaM-specific product attributes table
CREATE TABLE public.stam_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  nusach text, -- אשכנזי / ספרדי / חב"ד / תימני / אריז"ל
  kosher_level text, -- כשר / מהודר / מהודר מן המהודר
  script_type text, -- בית יוסף / וועליש / אר"י
  parchment_size_cm numeric,
  certificate_info text, -- פרטי תעודת הכשר
  sofer_name text,
  beit_din text, -- בד"ץ מפקח
  housing_type text, -- לתפילין: גסות / דקות / פשוטים
  is_checked_by_computer boolean DEFAULT true,
  is_checked_by_human boolean DEFAULT true,
  additional_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE public.stam_attributes ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "STaM attributes are publicly readable"
ON public.stam_attributes FOR SELECT
USING (true);

-- Admin manage
CREATE POLICY "Admins can manage STaM attributes"
ON public.stam_attributes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
