import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { LogOut, Package } from "lucide-react";

const AccountPage = () => {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  const { data: customer } = useQuery({
    queryKey: ["my-customer", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders", customer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: !!customer,
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold">החשבון שלי</h1>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            התנתק
          </Button>
        </div>

        {/* Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>פרטים אישיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">אימייל:</span> {user.email}</div>
            {customer && (
              <>
                <div><span className="text-muted-foreground">שם:</span> {customer.full_name || "—"}</div>
                <div><span className="text-muted-foreground">טלפון:</span> {customer.phone || "—"}</div>
                <div><span className="text-muted-foreground">עיר:</span> {customer.city || "—"}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              ההזמנות שלי
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium">הזמנה #{order.order_number}</span>
                      <span className="text-sm text-muted-foreground mr-3">
                        {order.created_at ? formatDate(order.created_at) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{order.status}</Badge>
                      <span className="font-bold">₪{Number(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">אין הזמנות עדיין.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;
