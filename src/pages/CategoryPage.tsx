import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import ProductCard from "@/components/storefront/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

type SortOption = "newest" | "price_asc" | "price_desc" | "name";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

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

  const { data: products, isLoading } = useQuery({
    queryKey: ["category-products", slug, sort, inStockOnly],
    queryFn: async () => {
      // First get product IDs for this category
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images(url, position),
          product_categories!inner(category_id)
        `)
        .eq("is_active", true);

      if (category) {
        query = query.eq("product_categories.category_id", category.id);
      }

      if (inStockOnly) {
        query = query.gt("stock", 0);
      }

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "name": query = query.order("name", { ascending: true }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  return (
    <div className="min-h-screen bg-background">
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
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
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
            <Switch id="in-stock" checked={inStockOnly} onCheckedChange={setInStockOnly} />
            <Label htmlFor="in-stock" className="text-sm">במלאי בלבד</Label>
          </div>

          {products && (
            <span className="text-sm text-muted-foreground mr-auto">
              {products.length} מוצרים
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
