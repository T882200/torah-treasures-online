import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Truck, Loader2, Tag, ExternalLink } from "lucide-react";

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const shippingCost = subtotal >= 200 ? 0 : 25;
  const total = subtotal - couponDiscount + shippingCost;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "ישראל",
    city: "",
    street: "",
    houseNumber: "",
    floor: "",
    apartment: "",
    zip: "",
    shippingNotes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!coupon) {
        toast.error("קופון לא נמצא או לא פעיל");
        return;
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error("הקופון פג תוקף");
        return;
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error("הקופון מוצה");
        return;
      }
      if (coupon.min_order && subtotal < Number(coupon.min_order)) {
        toast.error(`הזמנה מינימלית לקופון: ₪${Number(coupon.min_order).toFixed(2)}`);
        return;
      }

      const discount = coupon.type === "percentage"
        ? subtotal * (Number(coupon.value) / 100)
        : Number(coupon.value);

      setCouponDiscount(Math.min(discount, subtotal));
      setAppliedCoupon(coupon.code);
      toast.success(`קופון ${coupon.code} הופעל! הנחה: ₪${Math.min(discount, subtotal).toFixed(2)}`);
    } catch (err: any) {
      toast.error("שגיאה בבדיקת הקופון");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const addressLine1 = `${form.street} ${form.houseNumber}`.trim();
      const addressLine2 = [form.floor && `קומה ${form.floor}`, form.apartment && `דירה ${form.apartment}`].filter(Boolean).join(", ");

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .upsert({
          email: form.email,
          full_name: fullName,
          phone: form.phone,
          country: form.country,
          city: form.city,
          street: form.street,
          house_number: form.houseNumber,
          floor: form.floor || null,
          apartment: form.apartment || null,
          address_line1: addressLine1,
          address_line2: addressLine2 || null,
          zip: form.zip || null,
          shipping_notes: form.shippingNotes || null,
          ...(user ? { auth_id: user.id } : {}),
        }, { onConflict: "email" })
        .select("id")
        .single();

      if (custErr) throw custErr;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customer.id,
          subtotal,
          shipping_cost: shippingCost,
          discount: couponDiscount,
          coupon_code: appliedCoupon,
          coupon_discount: couponDiscount,
          total,
          status: "pending",
          payment_status: "unpaid",
          payment_method: "manual",
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

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

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Increment coupon usage
      if (appliedCoupon) {
        await supabase.rpc("has_role", { _user_id: user?.id || "00000000-0000-0000-0000-000000000000", _role: "user" }); // just to avoid unused, actual increment below
        await supabase
          .from("coupons")
          .update({ used_count: (await supabase.from("coupons").select("used_count").eq("code", appliedCoupon).single()).data?.used_count! + 1 })
          .eq("code", appliedCoupon);
      }

      toast.success(`ההזמנה #${order.order_number} נוצרה בהצלחה! 🎉`);
      clearCart();
      navigate(`/order-confirmation/${order.order_number}`);
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
                  <Label htmlFor="firstName">שם פרטי *</Label>
                  <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="lastName">שם משפחה *</Label>
                  <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
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
                  <Label htmlFor="country">ארץ</Label>
                  <Input id="country" name="country" value={form.country} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="city">עיר *</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="street">רחוב *</Label>
                  <Input id="street" name="street" value={form.street} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="houseNumber">בית *</Label>
                    <Input id="houseNumber" name="houseNumber" value={form.houseNumber} onChange={handleChange} required />
                  </div>
                  <div>
                    <Label htmlFor="floor">קומה</Label>
                    <Input id="floor" name="floor" value={form.floor} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="apartment">דירה</Label>
                    <Input id="apartment" name="apartment" value={form.apartment} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="zip">מיקוד</Label>
                  <div className="flex gap-2">
                    <Input id="zip" name="zip" value={form.zip} onChange={handleChange} dir="ltr" />
                    <a
                      href="https://www.israelpost.co.il/zipcodesearch.nsf/demoalilonapplications?OpenForm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent hover:underline whitespace-nowrap self-end pb-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      איתור מיקוד
                    </a>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="shippingNotes">הערות למשלוח</Label>
                  <Textarea id="shippingNotes" name="shippingNotes" value={form.shippingNotes} onChange={handleChange} rows={2} placeholder="הנחיות מיוחדות לשליח..." />
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-5 w-5 text-accent" />
                <h2 className="font-display font-bold text-lg">קופון הנחה</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="הזן קוד קופון"
                  dir="ltr"
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <Button type="button" variant="outline" onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); setCouponCode(""); }}>
                    הסר
                  </Button>
                ) : (
                  <Button type="button" variant="gold" onClick={handleApplyCoupon} disabled={applyingCoupon}>
                    {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "החל"}
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-sm text-green-600 mt-2">✓ קופון {appliedCoupon} פעיל — הנחה ₪{couponDiscount.toFixed(2)}</p>
              )}
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
                  <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span className="font-medium">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span>₪{subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>הנחת קופון</span>
                    <span>-₪{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">משלוח</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600">חינם</span> : `₪${shippingCost.toFixed(2)}`}</span>
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
