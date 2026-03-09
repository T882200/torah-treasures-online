import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";

const MAX_RECENT = 10;
const STORAGE_KEY = "recently-viewed";

export const trackRecentlyViewed = (productId: string) => {
  try {
    const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [productId, ...stored.filter(id => id !== productId)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
};

interface Props { currentProductId: string; }

const RecentlyViewed = ({ currentProductId }: Props) => {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setIds(stored.filter(id => id !== currentProductId).slice(0, 6));
    } catch {}
  }, [currentProductId]);

  const { data: products } = useQuery({
    queryKey: ["recently-viewed", ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, position)")
        .in("id", ids)
        .eq("is_active", true);
      if (error) throw error;
      // Sort by the order in ids
      return ids.map(id => data.find(p => p.id === id)).filter(Boolean) as typeof data;
    },
    enabled: ids.length > 0,
  });

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">צפיתם לאחרונה</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map(product => (
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

export default RecentlyViewed;
