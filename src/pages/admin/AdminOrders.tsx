import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  paid: "שולם",
  processing: "בטיפול",
  shipped: "נשלח",
  delivered: "נמסר",
  cancelled: "בוטל",
  refunded: "הוחזר",
};

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "paid":
    case "delivered": return "default";
    case "shipped":
    case "processing": return "secondary";
    case "cancelled":
    case "refunded": return "destructive";
    default: return "outline";
  }
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, customers(full_name, email)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

  return (
    <AdminLayout title="הזמנות">
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מס׳</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>לקוח</TableHead>
              <TableHead>סה״כ</TableHead>
              <TableHead>תשלום</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>משלוח</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">טוען...</TableCell>
              </TableRow>
            ) : orders && orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">#{order.order_number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.created_at ? formatDate(order.created_at) : "—"}
                  </TableCell>
                  <TableCell>{(order.customers as any)?.full_name || (order.customers as any)?.email || "—"}</TableCell>
                  <TableCell className="font-medium">₪{Number(order.total || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={order.payment_status === "paid" ? "default" : "outline"}>
                      {order.payment_status === "paid" ? "שולם" : "לא שולם"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(order.status || "pending")}>
                      {statusLabels[order.status || "pending"] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.shipping_status === "delivered" ? "default" : "outline"}>
                      {statusLabels[order.shipping_status || "pending"] || order.shipping_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  אין הזמנות עדיין.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
