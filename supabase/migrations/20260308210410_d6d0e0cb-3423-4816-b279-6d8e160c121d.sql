
-- Drop overly permissive policies
DROP POLICY "Authenticated users can create orders" ON public.orders;
DROP POLICY "Authenticated users can create order items" ON public.order_items;

-- Tighter: users can only create orders linked to their own customer record
CREATE POLICY "Authenticated users can create own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_id = auth.uid()
  )
);

-- Users can only create order items for their own orders
CREATE POLICY "Authenticated users can create own order items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE customer_id IN (
      SELECT id FROM public.customers WHERE auth_id = auth.uid()
    )
  )
);
