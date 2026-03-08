import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  productId: string;
}

const ProductCategoryManager = ({ productId }: Props) => {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [cats, links] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("product_categories").select("category_id").eq("product_id", productId),
      ]);
      if (cats.data) setCategories(cats.data);
      if (links.data) setSelected(new Set(links.data.map(l => l.category_id)));
      setLoading(false);
    };
    load();
  }, [productId]);

  const toggle = async (catId: string) => {
    const isSelected = selected.has(catId);
    try {
      if (isSelected) {
        await supabase.from("product_categories").delete().eq("product_id", productId).eq("category_id", catId);
        setSelected(prev => { const n = new Set(prev); n.delete(catId); return n; });
      } else {
        await supabase.from("product_categories").insert({ product_id: productId, category_id: catId });
        setSelected(prev => new Set(prev).add(catId));
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">טוען קטגוריות...</p>;
  if (!categories.length) return <p className="text-sm text-muted-foreground">אין קטגוריות — <a href="/admin/categories" className="text-accent underline">צור קטגוריה</a></p>;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-3">
      <h2 className="font-display font-bold text-lg">קטגוריות</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map(c => (
          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ProductCategoryManager;
