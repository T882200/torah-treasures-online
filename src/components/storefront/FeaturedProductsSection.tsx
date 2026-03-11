import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { motion } from "framer-motion";

interface FeaturedProductsSectionProps {
  title: string;
  config: any;
}

const FeaturedProductsSection = ({ title, config }: FeaturedProductsSectionProps) => {
  const productIds: string[] = config.product_ids || [];
  const limit = config.limit || 4;

  const { data: products } = useQuery({
    queryKey: ["featured-products", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, price_raw, in_stock, product_images(url, position)")
        .in("id", productIds)
        .eq("is_active", true)
        .limit(limit);
      if (error) throw error;
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        priceRaw: p.price_raw ? Number(p.price_raw) : undefined,
        imageUrl: p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0]?.url,
        inStock: p.in_stock ?? true,
      }));
    },
    enabled: productIds.length > 0,
  });

  if (!products || products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
          {title || "מוצרים נבחרים"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <ProductCard {...product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
