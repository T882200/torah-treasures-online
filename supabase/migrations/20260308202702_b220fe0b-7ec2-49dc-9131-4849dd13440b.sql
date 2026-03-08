
-- ============================================
-- ROLE SYSTEM
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TIMESTAMP TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES public.categories(id),
  position INTEGER DEFAULT 0,
  image_url TEXT
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  price_raw NUMERIC(10,2),
  catalog_number TEXT,
  barcode TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  in_stock BOOLEAN GENERATED ALWAYS AS (stock > 0) STORED,
  parent_id UUID REFERENCES public.products(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products are publicly readable"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PRODUCT VARIANTS
-- ============================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_label TEXT NOT NULL,
  variant_value TEXT NOT NULL,
  price_override NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product variants are publicly readable"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Admins can manage product variants"
  ON public.product_variants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT IMAGES
-- ============================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  alt_text TEXT,
  is_video BOOLEAN DEFAULT false
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are publicly readable"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images"
  ON public.product_images FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT GROUPS
-- ============================================
CREATE TABLE public.product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT
);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product groups are publicly readable"
  ON public.product_groups FOR SELECT USING (true);

CREATE POLICY "Admins can manage product groups"
  ON public.product_groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_group_items (
  group_id UUID REFERENCES public.product_groups(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (group_id, product_id)
);

ALTER TABLE public.product_group_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product group items are publicly readable"
  ON public.product_group_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage product group items"
  ON public.product_group_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT CATEGORIES (junction table)
-- ============================================
CREATE TABLE public.product_categories (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product categories are publicly readable"
  ON public.product_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage product categories"
  ON public.product_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  zip TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer record"
  ON public.customers FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own customer record"
  ON public.customers FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins can manage all customers"
  ON public.customers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  payment_ref TEXT,
  subtotal NUMERIC(10,2),
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2),
  shipping_method TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders (through customer_id link)
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  product_name TEXT,
  variant_label TEXT
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON o.customer_id = c.id
      WHERE c.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items"
  ON public.order_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CRM INTERACTIONS
-- ============================================
CREATE TABLE public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage CRM interactions"
  ON public.crm_interactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- EMAIL CAMPAIGNS
-- ============================================
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_filter JSONB,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- EMAIL SUBSCRIBERS
-- ============================================
CREATE TABLE public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  source TEXT
);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe"
  ON public.email_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage subscribers"
  ON public.email_subscribers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CHATBOT CONVERSATIONS
-- ============================================
CREATE TABLE public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'bot',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.chatbot_conversations FOR SELECT
  USING (session_id = auth.uid()::text OR customer_id IN (
    SELECT id FROM public.customers WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Anyone can create conversations"
  ON public.chatbot_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all conversations"
  ON public.chatbot_conversations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CHATBOT MESSAGES
-- ============================================
CREATE TABLE public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.chatbot_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations
      WHERE session_id = auth.uid()::text
        OR customer_id IN (SELECT id FROM public.customers WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can insert messages"
  ON public.chatbot_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all messages"
  ON public.chatbot_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-imports', 'csv-imports', false);

-- Public read for public buckets
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Category images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'category-images');

CREATE POLICY "Email assets are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');

-- Admin upload/manage for all buckets
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload category images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage category images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete category images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload email assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload csv imports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'csv-imports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read csv imports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'csv-imports' AND public.has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_catalog_number ON public.products(catalog_number);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_customers_auth_id ON public.customers(auth_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);
