import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Receipt, Truck, BarChart3, Loader2 } from "lucide-react";

type ExportType = "products" | "orders" | "customers" | "invoices" | "financial" | "shipping_labels";

const AdminExports = () => {
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) { toast.error("אין נתונים לייצוא"); return; }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProducts = async () => {
    setExporting("products");
    try {
      const { data, error } = await supabase.from("products").select("name, slug, price, price_raw, stock, barcode, catalog_number, is_active, created_at");
      if (error) throw error;
      downloadCSV(data || [], "products");
      toast.success(`${data?.length || 0} מוצרים יוצאו`);
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exportOrders = async () => {
    setExporting("orders");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, status, payment_status, shipping_status, subtotal, discount, shipping_cost, total, coupon_code, tracking_number, created_at, customers(full_name, email, phone, city)").order("created_at", { ascending: false });
      if (error) throw error;
      const flat = (data || []).map((o: any) => ({
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        shipping_status: o.shipping_status,
        subtotal: o.subtotal,
        discount: o.discount,
        shipping_cost: o.shipping_cost,
        total: o.total,
        coupon_code: o.coupon_code,
        tracking_number: o.tracking_number,
        customer_name: o.customers?.full_name,
        customer_email: o.customers?.email,
        customer_phone: o.customers?.phone,
        customer_city: o.customers?.city,
        created_at: o.created_at,
      }));
      downloadCSV(flat, "orders");
      toast.success(`${flat.length} הזמנות יוצאו`);
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exportCustomers = async () => {
    setExporting("customers");
    try {
      const { data, error } = await supabase.from("customers").select("full_name, email, phone, city, address_line1, zip, total_orders, total_spent, tags, created_at");
      if (error) throw error;
      const flat = (data || []).map(c => ({ ...c, tags: c.tags?.join("; ") || "" }));
      downloadCSV(flat, "customers");
      toast.success(`${flat.length} לקוחות יוצאו`);
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exportInvoices = async () => {
    setExporting("invoices");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, total, subtotal, shipping_cost, discount, payment_status, payment_method, created_at, customers(full_name, email, phone, city, address_line1, zip)").eq("payment_status", "paid").order("created_at", { ascending: false });
      if (error) throw error;
      const flat = (data || []).map((o: any) => ({
        invoice_number: `INV-${o.order_number}`,
        date: o.created_at?.split("T")[0],
        customer_name: o.customers?.full_name,
        customer_email: o.customers?.email,
        customer_address: `${o.customers?.address_line1 || ""}, ${o.customers?.city || ""} ${o.customers?.zip || ""}`,
        subtotal: o.subtotal,
        discount: o.discount,
        shipping: o.shipping_cost,
        total: o.total,
        payment_method: o.payment_method,
      }));
      downloadCSV(flat, "invoices");
      toast.success(`${flat.length} חשבוניות יוצאו`);
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exportFinancial = async () => {
    setExporting("financial");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, total, subtotal, shipping_cost, discount, payment_status, payment_method, coupon_code, coupon_discount, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      downloadCSV(data || [], "financial_report");
      toast.success("דוח פיננסי יוצא");
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exportShippingLabels = async () => {
    setExporting("shipping_labels");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, tracking_number, shipping_status, customers(full_name, phone, city, address_line1, address_line2, zip, country, street, house_number, floor, apartment, shipping_notes)").in("shipping_status", ["pending", "processing"]).order("created_at", { ascending: false });
      if (error) throw error;
      const flat = (data || []).map((o: any) => ({
        order_number: o.order_number,
        name: o.customers?.full_name,
        phone: o.customers?.phone,
        street: o.customers?.street,
        house: o.customers?.house_number,
        floor: o.customers?.floor,
        apartment: o.customers?.apartment,
        city: o.customers?.city,
        zip: o.customers?.zip,
        country: o.customers?.country,
        notes: o.customers?.shipping_notes,
        tracking: o.tracking_number,
      }));
      downloadCSV(flat, "shipping_labels");
      toast.success(`${flat.length} מדבקות משלוח יוצאו`);
    } catch (err: any) { toast.error(err.message); }
    finally { setExporting(null); }
  };

  const exports = [
    { type: "products" as ExportType, label: "מוצרים", icon: FileSpreadsheet, desc: "כל המוצרים עם מחירים, מלאי וברקודים", fn: exportProducts },
    { type: "orders" as ExportType, label: "הזמנות", icon: FileText, desc: "כל ההזמנות עם פרטי לקוח וסטטוסים", fn: exportOrders },
    { type: "customers" as ExportType, label: "לקוחות", icon: FileText, desc: "רשימת לקוחות עם פרטי קשר וסטטיסטיקות", fn: exportCustomers },
    { type: "invoices" as ExportType, label: "חשבוניות", icon: Receipt, desc: "חשבוניות להזמנות ששולמו", fn: exportInvoices },
    { type: "financial" as ExportType, label: "דוח פיננסי", icon: BarChart3, desc: "נתוני הכנסות, הנחות ותשלומים", fn: exportFinancial },
    { type: "shipping_labels" as ExportType, label: "מדבקות משלוח", icon: Truck, desc: "כתובות למשלוח להזמנות ממתינות", fn: exportShippingLabels },
  ];

  return (
    <AdminLayout title="ייצוא נתונים">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exports.map((exp) => (
          <Card key={exp.type} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <exp.icon className="h-5 w-5 text-accent" />
              <CardTitle className="text-base">{exp.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{exp.desc}</p>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={exp.fn}
                disabled={exporting === exp.type}
              >
                {exporting === exp.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting === exp.type ? "מייצא..." : "ייצוא CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminExports;
