import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import ProductCard from "@/components/storefront/ProductCard";
import SEOHead from "@/components/storefront/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

type SortOption = "newest" | "price_asc" | "price_desc" | "name" | "rating";
const PAGE_SIZE = 24;

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Get price bounds for filter
  const { data: priceBounds } = useQuery({
    queryKey: ["category-price-bounds", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("price, product_categories!inner(category_id)")
        .eq("is_active", true)
        .eq("product_categories.category_id", category!.id)
        .order("price", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return { min: 0, max: 1000 };
      return { min: Math.floor(Number(data[0].price)), max: Math.ceil(Number(data[data.length - 1].price)) };
    },
    enabled: !!category,
  });

  // Count query for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["category-count", slug, inStockOnly, category?.id, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, product_categories!inner(category_id)", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("product_categories.category_id", category!.id)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1]);
      if (inStockOnly) query = query.gt("stock", 0);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!category,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["category-products", slug, sort, inStockOnly, page, category?.id, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images(url, position),
          product_categories!inner(category_id)
        `)
        .eq("is_active", true)
        .eq("product_categories.category_id", category!.id)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1])
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (inStockOnly) query = query.gt("stock", 0);

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "name": query = query.order("name", { ascending: true }); break;
        case "rating": query = query.order("avg_rating", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen bg-background">
      {category && (
        <SEOHead
          title={`${category.name} | חנות ספרים`}
          description={`מבחר מוצרים בקטגוריית ${category.name}`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: category.name,
          }}
        />
      )}
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">דף הבית</Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{category?.name || slug}</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
          {category?.name || "קטגוריה"}
        </h1>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-8 py-4 border-b border-border">
          <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="מיון" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">חדשים ביותר</SelectItem>
              <SelectItem value="price_asc">מחיר: נמוך לגבוה</SelectItem>
              <SelectItem value="price_desc">מחיר: גבוה לנמוך</SelectItem>
              <SelectItem value="name">שם</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch id="in-stock" checked={inStockOnly} onCheckedChange={(v) => { setInStockOnly(v); setPage(0); }} />
            <Label htmlFor="in-stock" className="text-sm">במלאי בלבד</Label>
          </div>

          {totalCount !== undefined && (
            <span className="text-sm text-muted-foreground mr-auto">
              {totalCount} מוצרים
            </span>
          )}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  עמוד {page + 1} מתוך {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">אין מוצרים בקטגוריה זו עדיין.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
