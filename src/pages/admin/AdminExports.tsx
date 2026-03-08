import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Receipt, Truck, BarChart3, Loader2, ShoppingBag, Store, Settings2, Image } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ExportType = "products" | "orders" | "customers" | "invoices" | "financial" | "shipping_labels" | "shopify_products" | "shopify_orders" | "woo_products" | "woo_orders" | "wix_products";

const ALL_PRODUCT_FIELDS = [
  { key: "name", label: "שם" },
  { key: "slug", label: "Slug" },
  { key: "description", label: "תיאור" },
  { key: "price", label: "מחיר סופי" },
  { key: "price_raw", label: "מחיר מקורי" },
  { key: "stock", label: "מלאי" },
  { key: "barcode", label: "ברקוד" },
  { key: "catalog_number", label: "מק״ט" },
  { key: "is_active", label: "פעיל" },
  { key: "categories", label: "קטגוריות" },
  { key: "image_urls", label: "קישורי תמונות" },
  { key: "created_at", label: "תאריך יצירה" },
];

const AdminExports = () => {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  // Product export customization
  const [selectedFields, setSelectedFields] = useState<string[]>(ALL_PRODUCT_FIELDS.map(f => f.key));
  const [includeBase64, setIncludeBase64] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [base64Progress, setBase64Progress] = useState(0);
  const [showProductSettings, setShowProductSettings] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id, name").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const toggleField = (key: string) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const downloadCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data.length) { toast.error("אין נתונים לייצוא"); return; }
    const keys = headers || Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map(row => keys.map(h => {
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
    a.href = url; a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    return btoa(binary);
  };

  const imageToBase64 = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return "";
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Detect mime type from magic bytes
      let mime = "image/jpeg";
      if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = "image/png";
      else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = "image/gif";
      else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = "image/webp";
      const b64 = arrayBufferToBase64(buffer);
      return `data:${mime};base64,${b64}`;
    } catch (err) {
      console.warn("Base64 conversion failed for:", url, err);
      return "";
    }
  };

  const getProducts = async () => {
    const { data, error } = await supabase.from("products").select("*, product_images(url, position), product_categories(categories(id, name))");
    if (error) throw error;
    return data || [];
  };

  const getOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*, customers(full_name, email, phone, city, street, house_number, apartment, floor, zip, country, shipping_notes), order_items(product_name, quantity, unit_price, total_price, variant_label)").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  // ============ Enhanced product export ============
  const exportProducts = async () => {
    setExporting("products");
    setBase64Progress(0);
    try {
      let products = await getProducts();

      // Filter by category
      if (selectedCategory !== "all") {
        products = products.filter((p: any) =>
          p.product_categories?.some((pc: any) => pc.categories?.id === selectedCategory)
        );
      }

      // Build base64 map if needed
      const base64Map: Record<string, string> = {};
      if (includeBase64) {
        const allImages: { productId: string; url: string }[] = [];
        products.forEach((p: any) => {
          const mainImg = p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];
          if (mainImg?.url) allImages.push({ productId: p.id, url: mainImg.url });
        });
        for (let i = 0; i < allImages.length; i++) {
          base64Map[allImages[i].productId] = await imageToBase64(allImages[i].url);
          setBase64Progress(Math.round(((i + 1) / allImages.length) * 100));
        }
      }

      const rows = products.map((p: any) => {
        const imgs = p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) || [];
        const cats = p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean);
        const row: any = {};
        if (selectedFields.includes("name")) row.name = p.name;
        if (selectedFields.includes("slug")) row.slug = p.slug;
        if (selectedFields.includes("description")) row.description = p.description || "";
        if (selectedFields.includes("price")) row.price = p.price;
        if (selectedFields.includes("price_raw")) row.price_raw = p.price_raw || "";
        if (selectedFields.includes("stock")) row.stock = p.stock || 0;
        if (selectedFields.includes("barcode")) row.barcode = p.barcode || "";
        if (selectedFields.includes("catalog_number")) row.catalog_number = p.catalog_number || "";
        if (selectedFields.includes("is_active")) row.is_active = p.is_active ? "כן" : "לא";
        if (selectedFields.includes("categories")) row.categories = cats?.join("; ") || "";
        if (selectedFields.includes("image_urls")) row.image_urls = imgs.map((i: any) => i.url).join(" | ");
        if (selectedFields.includes("created_at")) row.created_at = p.created_at;
        if (includeBase64) row.image_base64 = base64Map[p.id] || "";
        return row;
      });

      downloadCSV(rows, "products");
      toast.success(`${rows.length} מוצרים יוצאו`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); setBase64Progress(0); }
  };

  const exportOrders = async () => {
    setExporting("orders");
    try {
      const orders = await getOrders();
      const flat = orders.map((o: any) => ({
        order_number: o.order_number, status: o.status, payment_status: o.payment_status,
        shipping_status: o.shipping_status, subtotal: o.subtotal, discount: o.discount,
        shipping_cost: o.shipping_cost, total: o.total, coupon_code: o.coupon_code,
        tracking_number: o.tracking_number, customer_name: o.customers?.full_name,
        customer_email: o.customers?.email, customer_phone: o.customers?.phone,
        customer_city: o.customers?.city, created_at: o.created_at,
      }));
      downloadCSV(flat, "orders");
      toast.success(`${flat.length} הזמנות יוצאו`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportCustomers = async () => {
    setExporting("customers");
    try {
      const { data, error } = await supabase.from("customers").select("full_name, email, phone, city, address_line1, zip, total_orders, total_spent, tags, created_at");
      if (error) throw error;
      const flat = (data || []).map(c => ({ ...c, tags: c.tags?.join("; ") || "" }));
      downloadCSV(flat, "customers");
      toast.success(`${flat.length} לקוחות יוצאו`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportInvoices = async () => {
    setExporting("invoices");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, total, subtotal, shipping_cost, discount, payment_status, payment_method, created_at, customers(full_name, email, phone, city, address_line1, zip)").eq("payment_status", "paid").order("created_at", { ascending: false });
      if (error) throw error;
      const flat = (data || []).map((o: any) => ({
        invoice_number: `INV-${o.order_number}`, date: o.created_at?.split("T")[0],
        customer_name: o.customers?.full_name, customer_email: o.customers?.email,
        customer_address: `${o.customers?.address_line1 || ""}, ${o.customers?.city || ""} ${o.customers?.zip || ""}`,
        subtotal: o.subtotal, discount: o.discount, shipping: o.shipping_cost, total: o.total, payment_method: o.payment_method,
      }));
      downloadCSV(flat, "invoices");
      toast.success(`${flat.length} חשבוניות יוצאו`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportFinancial = async () => {
    setExporting("financial");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, total, subtotal, shipping_cost, discount, payment_status, payment_method, coupon_code, coupon_discount, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      downloadCSV(data || [], "financial_report");
      toast.success("דוח פיננסי יוצא");
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportShippingLabels = async () => {
    setExporting("shipping_labels");
    try {
      const { data, error } = await supabase.from("orders").select("order_number, tracking_number, shipping_status, customers(full_name, phone, city, address_line1, address_line2, zip, country, street, house_number, floor, apartment, shipping_notes)").in("shipping_status", ["pending", "processing"]).order("created_at", { ascending: false });
      if (error) throw error;
      const flat = (data || []).map((o: any) => ({
        order_number: o.order_number, name: o.customers?.full_name, phone: o.customers?.phone,
        street: o.customers?.street, house: o.customers?.house_number, floor: o.customers?.floor,
        apartment: o.customers?.apartment, city: o.customers?.city, zip: o.customers?.zip,
        country: o.customers?.country, notes: o.customers?.shipping_notes, tracking: o.tracking_number,
      }));
      downloadCSV(flat, "shipping_labels");
      toast.success(`${flat.length} מדבקות משלוח יוצאו`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  // ============ Platform exports ============
  const exportShopifyProducts = async () => {
    setExporting("shopify_products");
    try {
      const products = await getProducts();
      const rows = products.map((p: any) => {
        const img = p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        const cats = p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean);
        return {
          Handle: p.slug, Title: p.name, "Body (HTML)": p.description || "", Vendor: "",
          "Product Category": cats?.[0] || "", Type: cats?.[0] || "", Tags: cats?.join(", ") || "",
          Published: p.is_active ? "TRUE" : "FALSE", "Option1 Name": "Title", "Option1 Value": "Default Title",
          "Variant SKU": p.catalog_number || "", "Variant Grams": "", "Variant Inventory Tracker": "shopify",
          "Variant Inventory Qty": p.stock || 0, "Variant Inventory Policy": "deny",
          "Variant Fulfillment Service": "manual", "Variant Price": p.price,
          "Variant Compare At Price": p.price_raw || "", "Variant Requires Shipping": "TRUE",
          "Variant Taxable": "TRUE", "Variant Barcode": p.barcode || "",
          "Image Src": img?.[0]?.url || "", "Image Position": 1, "Image Alt Text": p.name,
          "SEO Title": p.name, "SEO Description": (p.description || "").substring(0, 160),
          Status: p.is_active ? "active" : "draft",
        };
      });
      downloadCSV(rows, "shopify_products");
      toast.success(`${rows.length} מוצרים יוצאו בפורמט Shopify`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportShopifyOrders = async () => {
    setExporting("shopify_orders");
    try {
      const orders = await getOrders();
      const rows: any[] = [];
      orders.forEach((o: any) => {
        (o.order_items || []).forEach((item: any, idx: number) => {
          rows.push({
            Name: `#${o.order_number}`, Email: o.customers?.email || "",
            "Financial Status": o.payment_status === "paid" ? "paid" : "pending",
            "Fulfillment Status": o.shipping_status === "delivered" ? "fulfilled" : "unfulfilled",
            Currency: "ILS", "Lineitem quantity": item.quantity, "Lineitem name": item.product_name || "",
            "Lineitem price": item.unit_price, "Shipping Name": o.customers?.full_name || "",
            "Shipping Phone": o.customers?.phone || "",
            "Shipping Street": `${o.customers?.street || ""} ${o.customers?.house_number || ""}`.trim(),
            "Shipping City": o.customers?.city || "", "Shipping Zip": o.customers?.zip || "",
            "Shipping Country": o.customers?.country || "IL",
            Total: idx === 0 ? o.total : "", Subtotal: idx === 0 ? o.subtotal : "",
            Shipping: idx === 0 ? o.shipping_cost : "", Discount: idx === 0 ? o.discount : "",
            "Created at": o.created_at, Notes: o.notes || "",
          });
        });
      });
      downloadCSV(rows, "shopify_orders");
      toast.success(`${rows.length} שורות הזמנות יוצאו בפורמט Shopify`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportWooProducts = async () => {
    setExporting("woo_products");
    try {
      const products = await getProducts();
      const rows = products.map((p: any) => {
        const img = p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        const cats = p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean);
        return {
          ID: "", Type: "simple", SKU: p.catalog_number || "", Name: p.name,
          Published: p.is_active ? 1 : 0, "Is featured?": 0, "Visibility in catalog": "visible",
          "Short description": (p.description || "").substring(0, 200), Description: p.description || "",
          "Tax status": "taxable", "In stock?": (p.stock || 0) > 0 ? 1 : 0, Stock: p.stock || 0,
          "Backorders allowed?": 0, "Regular price": p.price_raw || p.price,
          "Sale price": p.price_raw ? p.price : "", Categories: cats?.join(", ") || "",
          Tags: "", Images: img?.map((i: any) => i.url).join(", ") || "", Barcode: p.barcode || "",
        };
      });
      downloadCSV(rows, "woocommerce_products");
      toast.success(`${rows.length} מוצרים יוצאו בפורמט WooCommerce`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportWooOrders = async () => {
    setExporting("woo_orders");
    try {
      const orders = await getOrders();
      const rows: any[] = [];
      orders.forEach((o: any) => {
        (o.order_items || []).forEach((item: any) => {
          rows.push({
            order_id: o.order_number, order_status: o.status || "pending", order_date: o.created_at,
            customer_email: o.customers?.email || "",
            billing_first_name: o.customers?.full_name?.split(" ")[0] || "",
            billing_last_name: o.customers?.full_name?.split(" ").slice(1).join(" ") || "",
            billing_phone: o.customers?.phone || "",
            billing_address_1: `${o.customers?.street || ""} ${o.customers?.house_number || ""}`.trim(),
            billing_city: o.customers?.city || "", billing_postcode: o.customers?.zip || "", billing_country: "IL",
            shipping_first_name: o.customers?.full_name?.split(" ")[0] || "",
            shipping_last_name: o.customers?.full_name?.split(" ").slice(1).join(" ") || "",
            shipping_address_1: `${o.customers?.street || ""} ${o.customers?.house_number || ""}`.trim(),
            shipping_city: o.customers?.city || "", shipping_postcode: o.customers?.zip || "", shipping_country: "IL",
            payment_method: o.payment_method || "", order_total: o.total,
            order_shipping: o.shipping_cost, order_discount: o.discount,
            line_item_name: item.product_name || "", line_item_qty: item.quantity, line_item_total: item.total_price,
          });
        });
      });
      downloadCSV(rows, "woocommerce_orders");
      toast.success(`${rows.length} שורות הזמנות יוצאו בפורמט WooCommerce`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const exportWixProducts = async () => {
    setExporting("wix_products");
    try {
      const products = await getProducts();
      const rows = products.map((p: any) => {
        const img = p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        const cats = p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean);
        return {
          handleId: p.slug, fieldType: "Product", name: p.name, description: p.description || "",
          productImageUrl: img?.[0]?.url || "", collection: cats?.join(";") || "",
          sku: p.catalog_number || "", ribbon: "", price: p.price, surcharge: 0,
          visible: p.is_active ? "true" : "false",
          discountMode: p.price_raw ? "AMOUNT" : "", discountValue: p.price_raw ? (p.price_raw - p.price) : "",
          inventory: "InStock", quantity: p.stock || 0, weight: "",
        };
      });
      downloadCSV(rows, "wix_products");
      toast.success(`${rows.length} מוצרים יוצאו בפורמט Wix`);
    } catch (err: any) { toast.error(err.message); } finally { setExporting(null); }
  };

  const standardExports = [
    { type: "orders" as ExportType, label: "הזמנות", icon: FileText, desc: "כל ההזמנות עם פרטי לקוח וסטטוסים", fn: exportOrders },
    { type: "customers" as ExportType, label: "לקוחות", icon: FileText, desc: "רשימת לקוחות עם פרטי קשר וסטטיסטיקות", fn: exportCustomers },
    { type: "invoices" as ExportType, label: "חשבוניות", icon: Receipt, desc: "חשבוניות להזמנות ששולמו", fn: exportInvoices },
    { type: "financial" as ExportType, label: "דוח פיננסי", icon: BarChart3, desc: "נתוני הכנסות, הנחות ותשלומים", fn: exportFinancial },
    { type: "shipping_labels" as ExportType, label: "מדבקות משלוח", icon: Truck, desc: "כתובות למשלוח להזמנות ממתינות", fn: exportShippingLabels },
  ];

  const platformExports = [
    { type: "shopify_products" as ExportType, label: "Shopify — מוצרים", icon: ShoppingBag, desc: "פורמט CSV תואם לייבוא מוצרים ל-Shopify", fn: exportShopifyProducts },
    { type: "shopify_orders" as ExportType, label: "Shopify — הזמנות", icon: ShoppingBag, desc: "פורמט CSV תואם ליצוא הזמנות Shopify", fn: exportShopifyOrders },
    { type: "woo_products" as ExportType, label: "WooCommerce — מוצרים", icon: Store, desc: "פורמט CSV תואם ל-WooCommerce (WordPress)", fn: exportWooProducts },
    { type: "woo_orders" as ExportType, label: "WooCommerce — הזמנות", icon: Store, desc: "פורמט CSV תואם ליצוא הזמנות WooCommerce", fn: exportWooOrders },
    { type: "wix_products" as ExportType, label: "Wix — מוצרים", icon: Store, desc: "פורמט CSV תואם לייבוא מוצרים ל-Wix", fn: exportWixProducts },
  ];

  return (
    <AdminLayout title="ייצוא נתונים">
      <Tabs defaultValue="standard">
        <TabsList className="mb-6">
          <TabsTrigger value="standard" className="gap-2"><Download className="h-3.5 w-3.5" />ייצוא רגיל</TabsTrigger>
          <TabsTrigger value="platforms" className="gap-2"><Store className="h-3.5 w-3.5" />ייצוא לפלטפורמות</TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          {/* Enhanced Product Export Card */}
          <Card className="mb-6 border-accent/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">ייצוא מוצרים מותאם אישית</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowProductSettings(!showProductSettings)} className="gap-1">
                <Settings2 className="h-4 w-4" />
                {showProductSettings ? "הסתר הגדרות" : "הגדרות"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showProductSettings && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                  {/* Category filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">סנן לפי קטגוריה</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="כל הקטגוריות" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל הקטגוריות</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Field selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">בחר שדות לייצוא</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {ALL_PRODUCT_FIELDS.map(f => (
                        <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedFields.includes(f.key)}
                            onCheckedChange={() => toggleField(f.key)}
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedFields(ALL_PRODUCT_FIELDS.map(f => f.key))}>בחר הכל</Button>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedFields([])}>נקה הכל</Button>
                    </div>
                  </div>

                  {/* Base64 images toggle */}
                  <div className="flex items-center gap-3 p-3 bg-card rounded-md border border-border">
                    <Image className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium">כלול תמונות כ-Base64</Label>
                      <p className="text-xs text-muted-foreground">ייצוא תמונה ראשית בקידוד Base64 — עלול להגדיל משמעותית את גודל הקובץ</p>
                    </div>
                    <Switch checked={includeBase64} onCheckedChange={setIncludeBase64} />
                  </div>
                </div>
              )}

              {base64Progress > 0 && base64Progress < 100 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ממיר תמונות ל-Base64... {base64Progress}%</p>
                  <Progress value={base64Progress} />
                </div>
              )}

              <Button variant="outline" className="gap-2 w-full" onClick={exportProducts} disabled={exporting === "products"}>
                {exporting === "products" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting === "products" ? "מייצא..." : "ייצוא מוצרים CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Other standard exports */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardExports.map((exp) => (
              <ExportCard key={exp.type} exp={exp} exporting={exporting} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="platforms">
          <p className="text-sm text-muted-foreground mb-4">ייצוא בפורמט תואם לייבוא ישיר למערכות איקומרס מובילות.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformExports.map((exp) => (
              <ExportCard key={exp.type} exp={exp} exporting={exporting} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

function ExportCard({ exp, exporting }: { exp: { type: ExportType; label: string; icon: any; desc: string; fn: () => Promise<void> }; exporting: ExportType | null }) {
  return (
    <Card className="hover:shadow-elegant transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <exp.icon className="h-5 w-5 text-accent" />
        <CardTitle className="text-base">{exp.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{exp.desc}</p>
        <Button variant="outline" className="gap-2 w-full" onClick={exp.fn} disabled={exporting === exp.type}>
          {exporting === exp.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting === exp.type ? "מייצא..." : "ייצוא CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default AdminExports;
