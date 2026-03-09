import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ProductImageManager from "@/components/admin/ProductImageManager";
import ProductCategoryManager from "@/components/admin/ProductCategoryManager";
import ProductVariantManager from "@/components/admin/ProductVariantManager";
import StamAttributesEditor from "@/components/admin/StamAttributesEditor";
import ProductBadgeManager from "@/components/admin/ProductBadgeManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const [form, setForm] = useState({
    name: "", slug: "", description: "", price: "", price_raw: "",
    catalog_number: "", barcode: "", stock: "0", is_active: true,
  });
  const [savedProductId, setSavedProductId] = useState<string | null>(id || null);

  const { data: product } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name, slug: product.slug, description: product.description || "",
        price: String(product.price), price_raw: product.price_raw ? String(product.price_raw) : "",
        catalog_number: product.catalog_number || "", barcode: product.barcode || "",
        stock: String(product.stock || 0), is_active: product.is_active ?? true,
      });
    }
  }, [product]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^\w\s\u0590-\u05FF-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, slug: form.slug || generateSlug(form.name),
        description: form.description || null, price: parseFloat(form.price),
        price_raw: form.price_raw ? parseFloat(form.price_raw) : null,
        catalog_number: form.catalog_number || null, barcode: form.barcode || null,
        stock: parseInt(form.stock) || 0, is_active: form.is_active,
      };
      if (isNew && !savedProductId) {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        setSavedProductId(data.id);
        return data.id;
      } else {
        const productId = savedProductId || id!;
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
        return productId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(isNew && !savedProductId ? "המוצר נוצר — כעת ניתן להעלות תמונות" : "המוצר עודכן בהצלחה");
    },
    onError: (err: any) => { toast.error(`שגיאה: ${err.message}`); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error("שם ומחיר הם שדות חובה"); return; }
    saveMutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "name" && (isNew || !prev.slug)) updated.slug = generateSlug(value);
      return updated;
    });
  };

  return (
    <AdminLayout title={isNew ? "מוצר חדש" : "עריכת מוצר"}>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
          <h2 className="font-display font-bold text-lg">פרטי מוצר</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label htmlFor="name">שם המוצר *</Label><Input id="name" name="name" value={form.name} onChange={handleChange} required /></div>
            <div><Label htmlFor="slug">Slug (URL)</Label><Input id="slug" name="slug" value={form.slug} onChange={handleChange} dir="ltr" /></div>
          </div>
          <div><Label htmlFor="description">תיאור</Label><Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label htmlFor="price">מחיר סופי (₪) *</Label><Input id="price" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required dir="ltr" /></div>
            <div><Label htmlFor="price_raw">מחיר מקורי (₪)</Label><Input id="price_raw" name="price_raw" type="number" step="0.01" value={form.price_raw} onChange={handleChange} dir="ltr" /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label htmlFor="catalog_number">מק״ט</Label><Input id="catalog_number" name="catalog_number" value={form.catalog_number} onChange={handleChange} /></div>
            <div><Label htmlFor="barcode">ברקוד</Label><Input id="barcode" name="barcode" value={form.barcode} onChange={handleChange} dir="ltr" /></div>
            <div><Label htmlFor="stock">מלאי</Label><Input id="stock" name="stock" type="number" value={form.stock} onChange={handleChange} dir="ltr" /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={form.is_active} onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))} />
            <Label htmlFor="is_active">מוצר פעיל</Label>
          </div>
        </div>

        {savedProductId && <ProductCategoryManager productId={savedProductId} />}
        {savedProductId && <ProductImageManager productId={savedProductId} />}
        {savedProductId && <ProductVariantManager productId={savedProductId} />}
        {savedProductId && <StamAttributesEditor productId={savedProductId} />}
        {savedProductId && <ProductBadgeManager productId={savedProductId} />}

        <div className="flex gap-3">
          <Button type="submit" variant="gold" className="gap-2" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />{saveMutation.isPending ? "שומר..." : "שמור"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>ביטול</Button>
        </div>
      </form>
    </AdminLayout>
  );
};

export default AdminProductEdit;
