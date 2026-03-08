import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingCart, Users, DollarSign, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, CreditCard, Truck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "#10b981", "#f59e0b"];

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, lowStockRes, recentOrdersRes, chatRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, payment_status, shipping_status, created_at", { count: "exact" }),
        supabase.from("customers").select("id, created_at", { count: "exact" }),
        supabase.from("products").select("id, name, stock").lt("stock", 5).eq("is_active", true),
        supabase.from("orders").select("id, order_number, total, status, payment_status, created_at, customers(full_name)").order("created_at", { ascending: false }).limit(8),
        supabase.from("chatbot_conversations").select("id", { count: "exact", head: true }),
      ]);

      const orders = ordersRes.data || [];
      const today = new Date().toISOString().split("T")[0];
      const yesterday = subDays(new Date(), 1).toISOString().split("T")[0];
      const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
      const yesterdayOrders = orders.filter(o => o.created_at?.startsWith(yesterday));
      const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

      // Last 14 days
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayOrders = orders.filter(o => o.created_at?.startsWith(dateStr));
        return {
          date: format(date, "dd/MM"),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        };
      });

      // Status distribution
      const statusCounts: Record<string, number> = {};
      orders.forEach(o => { statusCounts[o.status || "pending"] = (statusCounts[o.status || "pending"] || 0) + 1; });
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

      // Payment status
      const paymentCounts: Record<string, number> = {};
      orders.forEach(o => { paymentCounts[o.payment_status || "unpaid"] = (paymentCounts[o.payment_status || "unpaid"] || 0) + 1; });
      const paymentData = Object.entries(paymentCounts).map(([name, value]) => ({ name: paymentLabels[name] || name, value }));

      // New customers last 7 days
      const newCustomers7d = (customersRes.data || []).filter((c: any) => {
        const d = new Date(c.created_at);
        return d >= subDays(new Date(), 7);
      }).length;

      return {
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalCustomers: customersRes.count || 0,
        todayOrders: todayOrders.length,
        yesterdayOrders: yesterdayOrders.length,
        todayRevenue,
        yesterdayRevenue,
        totalRevenue,
        lowStock: lowStockRes.data || [],
        last14Days,
        statusData,
        paymentData,
        recentOrders: recentOrdersRes.data || [],
        totalChats: chatRes.count || 0,
        newCustomers7d,
        avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
      };
    },
  });

  const revenueChange = stats?.yesterdayRevenue ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue * 100) : 0;
  const ordersChange = stats?.yesterdayOrders ? ((stats.todayOrders - stats.yesterdayOrders) / stats.yesterdayOrders * 100) : 0;

  return (
    <AdminLayout title="דשבורד">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="הכנסות היום" value={`₪${(stats?.todayRevenue || 0).toLocaleString()}`} change={revenueChange} icon={DollarSign} href="/admin/orders" />
        <KPICard label="הזמנות היום" value={String(stats?.todayOrders || 0)} change={ordersChange} icon={ShoppingCart} href="/admin/orders" />
        <KPICard label="ממוצע הזמנה" value={`₪${(stats?.avgOrderValue || 0).toFixed(0)}`} icon={CreditCard} />
        <KPICard label="לקוחות חדשים (7 ימים)" value={String(stats?.newCustomers7d || 0)} icon={Users} href="/admin/customers" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat label="סה״כ הכנסות" value={`₪${(stats?.totalRevenue || 0).toLocaleString()}`} icon={TrendingUp} />
        <MiniStat label="סה״כ מוצרים" value={String(stats?.totalProducts || 0)} icon={Package} href="/admin/products" />
        <MiniStat label="סה״כ הזמנות" value={String(stats?.totalOrders || 0)} icon={ShoppingCart} href="/admin/orders" />
        <MiniStat label="שיחות צ׳אט" value={String(stats?.totalChats || 0)} icon={MessageCircle} href="/admin/chat" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">הכנסות — 14 ימים אחרונים</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats?.last14Days || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(v: number) => `₪${v.toLocaleString()}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">סטטוס הזמנות</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats?.statusData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {(stats?.statusData || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">הזמנות — 14 ימים</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.last14Days || []}>
                <XAxis dataKey="date" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">סטטוס תשלום</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats?.paymentData || []} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                  {(stats?.paymentData || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">הזמנות אחרונות</CardTitle>
            <Link to="/admin/orders" className="text-xs text-accent hover:underline">הכל →</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(stats?.recentOrders || []).slice(0, 6).map((o: any) => (
                <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">#{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{o.customers?.full_name || "—"}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">₪{Number(o.total || 0).toFixed(0)}</p>
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"} className="text-[9px]">
                      {paymentLabels[o.payment_status] || o.payment_status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock */}
      {stats?.lowStock && stats.lowStock.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <AlertTriangle className="h-5 w-5" />
              התראות מלאי נמוך ({stats.lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.lowStock.map((p: any) => (
                <Link key={p.id} to={`/admin/products/${p.id}`} className="flex justify-between items-center py-2 px-3 rounded-md hover:bg-muted transition-colors border border-border">
                  <span className="text-sm truncate">{p.name}</span>
                  <Badge variant="destructive" className="text-xs mr-2">{p.stock} יח׳</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  processing: "בטיפול",
  shipped: "נשלח",
  delivered: "נמסר",
  cancelled: "בוטל",
};

const paymentLabels: Record<string, string> = {
  paid: "שולם",
  unpaid: "לא שולם",
  refunded: "הוחזר",
  partial: "חלקי",
};

function KPICard({ label, value, change, icon: Icon, href }: { label: string; value: string; change?: number; icon: any; href?: string }) {
  const Wrapper = href ? Link : "div";
  const isPositive = (change || 0) >= 0;
  return (
    <Wrapper to={href || ""} className="block">
      <Card className="hover:shadow-elegant transition-all hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <p className="text-2xl font-bold font-display">{value}</p>
          {change !== undefined && change !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? "text-green-600" : "text-destructive"}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(0)}% מאתמול
            </div>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function MiniStat({ label, value, icon: Icon, href }: { label: string; value: string; icon: any; href?: string }) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper to={href || ""} className="block">
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold font-display">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

export default AdminDashboard;
