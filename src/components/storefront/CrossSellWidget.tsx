import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";

interface Props { productIds: string[]; }

const CrossSellWidget = ({ productIds }: Props) => {
  const { data: relatedProducts } = useQuery({
    queryKey: ["cross-sell", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("product_relations")
        .select("related_product_id, products:related_product_id(*, product_images(url, position))")
        .in("product_id", productIds)
        .eq("relation_type", "cross_sell")
        .order("position")
        .limit(8);
      if (error) throw error;
      // Deduplicate and exclude items already in cart
      const seen = new Set(productIds);
      const unique: any[] = [];
      for (const r of data || []) {
        const p = (r as any).products;
        if (p && !seen.has(p.id) && p.is_active) {
          seen.add(p.id);
          unique.push(p);
        }
      }
      return unique.slice(0, 4);
    },
    enabled: productIds.length > 0,
  });

  if (!relatedProducts || relatedProducts.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">לקוחות שקנו גם...</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {relatedProducts.map((product: any) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            slug={product.slug}
            price={Number(product.price)}
            priceRaw={product.price_raw ? Number(product.price_raw) : undefined}
            imageUrl={product.product_images?.[0]?.url}
            inStock={product.in_stock ?? false}
          />
        ))}
      </div>
    </section>
  );
};

export default CrossSellWidget;
