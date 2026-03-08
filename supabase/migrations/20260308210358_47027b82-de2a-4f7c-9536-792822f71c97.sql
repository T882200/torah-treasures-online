
-- Allow authenticated users to create orders
CREATE POLICY "Authenticated users can create orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to create order items for their orders
CREATE POLICY "Authenticated users can create order items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert customer record
CREATE POLICY "Authenticated users can insert customer record"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = auth_id OR auth_id IS NULL);

-- Add unique constraint on email for upsert
ALTER TABLE public.customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
