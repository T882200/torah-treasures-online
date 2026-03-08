import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";

const OrderConfirmationPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-confirmation", orderNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(*), customers(full_name, email, phone, city, address_line1)`)
        .eq("order_number", parseInt(orderNumber!))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        {isLoading ? (
          <p className="text-muted-foreground">טוען...</p>
        ) : order ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              ההזמנה התקבלה! 🎉
            </h1>
            <p className="text-muted-foreground mb-8">
              תודה על ההזמנה. מספר הזמנה: <span className="font-bold text-foreground">#{order.order_number}</span>
            </p>

            <div className="bg-card rounded-lg border border-border p-6 shadow-card text-right mb-6">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                פרטי ההזמנה
              </h2>

              <div className="space-y-3 mb-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">₪{Number(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span>₪{Number(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">משלוח</span>
                  <span>{Number(order.shipping_cost) === 0 ? "חינם" : `₪${Number(order.shipping_cost || 0).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                  <span>סה״כ</span>
                  <span>₪{Number(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.customers && (
              <div className="bg-card rounded-lg border border-border p-6 shadow-card text-right mb-8">
                <h3 className="font-display font-bold mb-2">כתובת למשלוח</h3>
                <p className="text-sm text-muted-foreground">
                  {(order.customers as any).full_name}<br />
                  {(order.customers as any).address_line1}<br />
                  {(order.customers as any).city}<br />
                  {(order.customers as any).phone}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/">
                <Button variant="gold" className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  המשך לקנות
                </Button>
              </Link>
              <Link to="/account">
                <Button variant="outline">צפה בהזמנות שלי</Button>
              </Link>
            </div>
          </>
        ) : (
          <div>
            <h1 className="font-display text-2xl font-bold mb-4">הזמנה לא נמצאה</h1>
            <Link to="/"><Button variant="gold">חזרה לדף הבית</Button></Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmationPage;
