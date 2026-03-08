import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Truck, Loader2 } from "lucide-react";

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const shippingCost = subtotal >= 200 ? 0 : 25;
  const total = subtotal + shippingCost;
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    zip: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Upsert customer
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .upsert({
          email: form.email,
          full_name: form.fullName,
          phone: form.phone,
          address_line1: form.addressLine1,
          address_line2: form.addressLine2 || null,
          city: form.city,
          zip: form.zip || null,
          ...(user ? { auth_id: user.id } : {}),
        }, { onConflict: "email" })
        .select("id")
        .single();

      if (custErr) throw custErr;

      // 2. Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customer.id,
          subtotal,
          shipping_cost: shippingCost,
          total,
          status: "pending",
          payment_status: "unpaid",
          payment_method: "manual",
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      // 3. Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        product_name: item.name,
        variant_label: item.variantLabel || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      toast.success(`ההזמנה #${order.order_number} נוצרה בהצלחה! 🎉`);
      clearCart();
      navigate("/");
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      toast.error("שגיאה ביצירת ההזמנה, נסה שוב");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">תשלום</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-lg">פרטי משלוח</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">שם מלא *</Label>
                  <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="email">אימייל *</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="city">עיר *</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="addressLine1">כתובת - שורה 1 *</Label>
                  <Input id="addressLine1" name="addressLine1" value={form.addressLine1} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="addressLine2">כתובת - שורה 2</Label>
                  <Input id="addressLine2" name="addressLine2" value={form.addressLine2} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="zip">מיקוד</Label>
                  <Input id="zip" name="zip" value={form.zip} onChange={handleChange} dir="ltr" />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-lg">תשלום</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                כרגע ההזמנה נשמרת כ״ממתינה לתשלום״. שער תשלום יתווסף בקרוב.
              </p>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full md:w-auto" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> שולח...</> : `בצע הזמנה — ₪${total.toFixed(2)}`}
            </Button>
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-card h-fit sticky top-24">
            <h2 className="font-display font-bold text-lg mb-4">סיכום הזמנה</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span>₪{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">משלוח</span>
                  <span>{shippingCost === 0 ? <span className="text-emerald-600">חינם</span> : `₪${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                  <span>סה״כ</span>
                  <span>₪{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
