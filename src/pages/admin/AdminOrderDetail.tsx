import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ArrowRight, Save, Truck, CreditCard, User } from "lucide-react";

const statusOptions = [
  { value: "pending", label: "ממתין" },
  { value: "paid", label: "שולם" },
  { value: "processing", label: "בטיפול" },
  { value: "shipped", label: "נשלח" },
  { value: "delivered", label: "נמסר" },
  { value: "cancelled", label: "בוטל" },
  { value: "refunded", label: "הוחזר" },
];

const paymentOptions = [
  { value: "unpaid", label: "לא שולם" },
  { value: "paid", label: "שולם" },
  { value: "refunded", label: "הוחזר" },
];

const shippingOptions = [
  { value: "pending", label: "ממתין" },
  { value: "processing", label: "בהכנה" },
  { value: "shipped", label: "נשלח" },
  { value: "delivered", label: "נמסר" },
];

const AdminOrderDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(*, products(name, slug)), customers(*)`)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [shippingStatus, setShippingStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (order) {
      setStatus(order.status || "pending");
      setPaymentStatus(order.payment_status || "unpaid");
      setShippingStatus(order.shipping_status || "pending");
      setTrackingNumber(order.tracking_number || "");
      setTrackingUrl(order.tracking_url || "");
      setNotes(order.notes || "");
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: any = {
        status,
        payment_status: paymentStatus,
        shipping_status: shippingStatus,
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };
      if (shippingStatus === "shipped" && !order?.shipped_at) updates.shipped_at = new Date().toISOString();
      if (shippingStatus === "delivered" && !order?.delivered_at) updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from("orders").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("ההזמנה עודכנה");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

  if (isLoading) return <AdminLayout title="טוען..."><p>טוען...</p></AdminLayout>;
  if (!order) return <AdminLayout title="לא נמצא"><p>הזמנה לא נמצאה</p></AdminLayout>;

  const customer = order.customers as any;

  return (
    <AdminLayout title={`הזמנה #${order.order_number}`}>
      <div className="mb-4">
        <Link to="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          חזרה להזמנות
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader><CardTitle>פריטים</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      {item.variant_label && <span className="text-sm text-muted-foreground mr-2">({item.variant_label})</span>}
                      <span className="text-sm text-muted-foreground mr-2">× {item.quantity}</span>
                    </div>
                    <span className="font-bold">₪{Number(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">סכום ביניים</span><span>₪{Number(order.subtotal || 0).toFixed(2)}</span></div>
                {order.discount && <div className="flex justify-between"><span className="text-muted-foreground">הנחה</span><span className="text-destructive">-₪{Number(order.discount).toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">משלוח</span><span>{Number(order.shipping_cost) === 0 ? "חינם" : `₪${Number(order.shipping_cost || 0).toFixed(2)}`}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2"><span>סה״כ</span><span>₪{Number(order.total || 0).toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardHeader><CardTitle>ניהול סטטוס</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>סטטוס הזמנה</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>תשלום</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>משלוח</Label>
                  <Select value={shippingStatus} onValueChange={setShippingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {shippingOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>מספר מעקב</Label>
                  <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} dir="ltr" placeholder="e.g. IL123456789" />
                </div>
                <div>
                  <Label>קישור מעקב</Label>
                  <Input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} dir="ltr" placeholder="https://..." />
                </div>
              </div>

              <div>
                <Label>הערות פנימיות</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>

              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} variant="gold" className="gap-2">
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "שומר..." : "עדכן הזמנה"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> לקוח</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {customer ? (
                <>
                  <p className="font-medium">{customer.full_name || "—"}</p>
                  <p className="text-muted-foreground">{customer.email}</p>
                  <p className="text-muted-foreground">{customer.phone || "—"}</p>
                  <Link to={`/admin/customers/${customer.id}`} className="text-accent hover:underline text-xs">
                    צפה בכרטיס לקוח →
                  </Link>
                </>
              ) : <p className="text-muted-foreground">לא ידוע</p>}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> כתובת משלוח</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {customer ? (
                <>
                  <p>{customer.address_line1}</p>
                  {customer.address_line2 && <p>{customer.address_line2}</p>}
                  <p>{customer.city} {customer.zip}</p>
                </>
              ) : <p>—</p>}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>ציר זמן</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              {order.created_at && <div className="flex justify-between"><span className="text-muted-foreground">נוצרה</span><span>{formatDate(order.created_at)}</span></div>}
              {order.shipped_at && <div className="flex justify-between"><span className="text-muted-foreground">נשלחה</span><span>{formatDate(order.shipped_at)}</span></div>}
              {order.delivered_at && <div className="flex justify-between"><span className="text-muted-foreground">נמסרה</span><span>{formatDate(order.delivered_at)}</span></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrderDetail;
