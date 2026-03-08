import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Users, DollarSign, Package, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, lowStockRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, payment_status, created_at", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock").lt("stock", 5).eq("is_active", true),
      ]);

      const orders = ordersRes.data || [];
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const paidOrders = orders.filter(o => o.payment_status === "paid");

      // Last 7 days chart data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split("T")[0];
        const dayOrders = orders.filter(o => o.created_at?.startsWith(dateStr));
        return {
          date: new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(date),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        };
      });

      return {
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalCustomers: customersRes.count || 0,
        todayOrders: todayOrders.length,
        todayRevenue,
        totalRevenue,
        paidOrdersCount: paidOrders.length,
        lowStock: lowStockRes.data || [],
        last7Days,
      };
    },
  });

  const statCards = [
    { label: "הכנסות כולל", value: `₪${(stats?.totalRevenue || 0).toFixed(0)}`, icon: DollarSign, color: "text-green-600" },
    { label: "הזמנות היום", value: stats?.todayOrders || 0, icon: ShoppingCart, href: "/admin/orders" },
    { label: "הכנסות היום", value: `₪${(stats?.todayRevenue || 0).toFixed(0)}`, icon: TrendingUp, color: "text-accent" },
    { label: "סה״כ לקוחות", value: stats?.totalCustomers || 0, icon: Users, href: "/admin/customers" },
    { label: "סה״כ מוצרים", value: stats?.totalProducts || 0, icon: Package, href: "/admin/products" },
    { label: "סה״כ הזמנות", value: stats?.totalOrders || 0, icon: ShoppingCart, href: "/admin/orders" },
  ];

  return (
    <AdminLayout title="דשבורד">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => {
          const Wrapper = stat.href ? Link : "div";
          return (
            <Wrapper key={stat.label} to={stat.href || ""} className="block">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color || "text-accent"}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            </Wrapper>
          );
        })}
      </div>

      {/* Charts */}
      {stats?.last7Days && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-base">הזמנות — 7 ימים אחרונים</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">הכנסות — 7 ימים אחרונים</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => `₪${v.toFixed(0)}`} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Low Stock */}
      {stats?.lowStock && stats.lowStock.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              התראות מלאי נמוך
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.lowStock.map((p: any) => (
                <Link key={p.id} to={`/admin/products/${p.id}`} className="flex justify-between items-center py-2 px-3 rounded hover:bg-muted transition-colors">
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
