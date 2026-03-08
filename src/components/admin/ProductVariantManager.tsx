import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, Link2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Variant {
  id?: string;
  variant_label: string;
  variant_value: string;
  price_override: string;
  stock: string;
  sku: string;
  barcode: string;
  is_active: boolean;
  isNew?: boolean;
}

interface Props {
  productId: string;
}

const ProductVariantManager = ({ productId }: Props) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // For child-product linking
  const [childProducts, setChildProducts] = useState<{ id: string; name: string }[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<string[]>([]);
  const [showLinking, setShowLinking] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("variant_label");
      if (data) {
        setVariants(data.map(v => ({
          id: v.id,
          variant_label: v.variant_label,
          variant_value: v.variant_value,
          price_override: v.price_override ? String(v.price_override) : "",
          stock: String(v.stock || 0),
          sku: v.sku || "",
          barcode: v.barcode || "",
          is_active: v.is_active ?? true,
        })));
      }
      // Load child products linked via parent_id
      const { data: children } = await supabase.from("products").select("id, name").eq("parent_id", productId);
      if (children) setLinkedChildren(children.map(c => c.id));

      // Load all products for linking (exclude self)
      const { data: allProds } = await supabase.from("products").select("id, name").neq("id", productId).is("parent_id", null).order("name").limit(200);
      if (allProds) setChildProducts(allProds);

      setLoading(false);
    };
    load();
  }, [productId]);

  const addVariant = () => {
    setVariants(prev => [...prev, {
      variant_label: "", variant_value: "", price_override: "", stock: "0", sku: "", barcode: "", is_active: true, isNew: true,
    }]);
  };

  const updateVariant = (idx: number, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const removeVariant = async (idx: number) => {
    const v = variants[idx];
    if (v.id) {
      const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
      if (error) { toast.error(error.message); return; }
    }
    setVariants(prev => prev.filter((_, i) => i !== idx));
    toast.success("וריאציה נמחקה");
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const v of variants) {
        if (!v.variant_label || !v.variant_value) continue;
        const payload = {
          product_id: productId,
          variant_label: v.variant_label,
          variant_value: v.variant_value,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || null,
          barcode: v.barcode || null,
          is_active: v.is_active,
        };
        if (v.id) {
          await supabase.from("product_variants").update(payload).eq("id", v.id);
        } else {
          const { data } = await supabase.from("product_variants").insert(payload).select("id").single();
          if (data) v.id = data.id;
        }
        v.isNew = false;
      }
      toast.success("וריאציות נשמרו");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const toggleChildLink = async (childId: string) => {
    const isLinked = linkedChildren.includes(childId);
    if (isLinked) {
      await supabase.from("products").update({ parent_id: null }).eq("id", childId);
      setLinkedChildren(prev => prev.filter(id => id !== childId));
    } else {
      await supabase.from("products").update({ parent_id: productId }).eq("id", childId);
      setLinkedChildren(prev => [...prev, childId]);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">טוען וריאציות...</p>;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">וריאציות</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowLinking(!showLinking)}>
            <Link2 className="h-3.5 w-3.5" />
            איגום מוצרים
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={addVariant}>
            <Plus className="h-3.5 w-3.5" />
            הוסף וריאציה
          </Button>
        </div>
      </div>

      {showLinking && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
          <Label className="text-sm font-medium">קשר מוצרים קיימים כוריאציות של מוצר זה</Label>
          <p className="text-xs text-muted-foreground">מוצרים מקושרים יופיעו כוריאציות בדף המוצר, כולל התמונות שלהם</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {childProducts.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={linkedChildren.includes(p.id)}
                  onChange={() => toggleChildLink(p.id)}
                  className="rounded"
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {variants.length === 0 && (
        <p className="text-sm text-muted-foreground">אין וריאציות. הוסף וריאציות כמו צבע, מידה, וכו׳</p>
      )}

      {variants.map((v, idx) => (
        <div key={v.id || idx} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-border items-end">
          <div>
            <Label className="text-xs">סוג (צבע, מידה...)</Label>
            <Input value={v.variant_label} onChange={e => updateVariant(idx, "variant_label", e.target.value)} placeholder="צבע" />
          </div>
          <div>
            <Label className="text-xs">ערך</Label>
            <Input value={v.variant_value} onChange={e => updateVariant(idx, "variant_value", e.target.value)} placeholder="אדום" />
          </div>
          <div>
            <Label className="text-xs">מחיר חלופי (₪)</Label>
            <Input type="number" step="0.01" value={v.price_override} onChange={e => updateVariant(idx, "price_override", e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">מלאי</Label>
            <Input type="number" value={v.stock} onChange={e => updateVariant(idx, "stock", e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">מק״ט</Label>
            <Input value={v.sku} onChange={e => updateVariant(idx, "sku", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">ברקוד</Label>
            <Input value={v.barcode} onChange={e => updateVariant(idx, "barcode", e.target.value)} dir="ltr" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={v.is_active} onCheckedChange={c => updateVariant(idx, "is_active", c)} />
            <Label className="text-xs">פעיל</Label>
          </div>
          <div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeVariant(idx)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {variants.length > 0 && (
        <Button variant="gold" className="gap-2" onClick={saveAll} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "שומר..." : "שמור וריאציות"}
        </Button>
      )}
    </div>
  );
};

export default ProductVariantManager;
