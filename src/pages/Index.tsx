import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import HeroBanner from "@/components/storefront/HeroBanner";
import CategoryGrid from "@/components/storefront/CategoryGrid";
import ProductCarousel from "@/components/storefront/ProductCarousel";
import NewsletterSignup from "@/components/storefront/NewsletterSignup";

const Index = () => {
  const { data: newArrivals } = useQuery({
    queryKey: ["home-new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, price_raw, in_stock, product_images(url, position)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        priceRaw: p.price_raw ? Number(p.price_raw) : undefined,
        imageUrl: p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0]?.url,
        inStock: p.in_stock ?? true,
      }));
    },
  });

  const { data: bestSellers } = useQuery({
    queryKey: ["home-best-sellers"],
    queryFn: async () => {
      // Use products with most orders as "best sellers"
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, price_raw, in_stock, product_images(url, position)")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        priceRaw: p.price_raw ? Number(p.price_raw) : undefined,
        imageUrl: p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0]?.url,
        inStock: p.in_stock ?? true,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HeroBanner />
        <CategoryGrid />
        
        {newArrivals && newArrivals.length > 0 && (
          <ProductCarousel title="חדשים בחנות" products={newArrivals} />
        )}
        
        {/* Promo Banner */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="gradient-navy rounded-lg p-8 md:p-12 text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                משלוח חינם מעל ₪200
              </h2>
              <p className="text-primary-foreground/70 font-body">
                לכל רחבי הארץ • משלוח תוך 3-5 ימי עסקים
              </p>
            </div>
          </div>
        </section>

        {bestSellers && bestSellers.length > 0 && (
          <ProductCarousel title="רבי מכר" products={bestSellers} />
        )}
        
        <NewsletterSignup />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
