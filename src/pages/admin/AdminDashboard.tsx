import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, lowStockRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, created_at", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock").lt("stock", 5).eq("is_active", true),
      ]);
      
      const orders = ordersRes.data || [];
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      return {
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalCustomers: customersRes.count || 0,
        todayOrders: todayOrders.length,
        todayRevenue,
        lowStock: lowStockRes.data || [],
        recentOrders: orders.slice(0, 10),
      };
    },
  });

  const statCards = [
    { label: "סה״כ מוצרים", value: stats?.totalProducts || 0, icon: Package, href: "/admin/products" },
    { label: "סה״כ הזמנות", value: stats?.totalOrders || 0, icon: ShoppingCart, href: "/admin/orders" },
    { label: "סה״כ לקוחות", value: stats?.totalCustomers || 0, icon: Users, href: "/admin/customers" },
    { label: "הזמנות היום", value: stats?.todayOrders || 0, icon: ShoppingCart, href: "/admin/orders" },
  ];

  return (
    <AdminLayout title="דשבורד">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link to={stat.href} key={stat.label}>
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats?.todayRevenue !== undefined && stats.todayRevenue > 0 && (
        <Card className="mb-8">
          <CardContent className="py-4">
            <span className="text-muted-foreground">הכנסות היום: </span>
            <span className="font-bold text-lg">₪{stats.todayRevenue.toFixed(2)}</span>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {stats?.lowStock && stats.lowStock.length > 0 && (
        <Card className="mb-8 border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              התראות מלאי נמוך
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.lowStock.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/admin/products/${p.id}`}
                  className="flex justify-between items-center py-2 px-3 rounded hover:bg-muted transition-colors"
                >
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-bold text-destructive">{p.stock} יחידות</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
