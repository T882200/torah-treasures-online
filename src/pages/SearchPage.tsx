import { useSearchParams, Link, useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Search } from "lucide-react";

type SortOption = "relevance" | "newest" | "price_asc" | "price_desc" | "name" | "rating";
const PAGE_SIZE = 24;

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";

  const [localQuery, setLocalQuery] = useState(q);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  // Sync local input with URL param
  useEffect(() => {
    setLocalQuery(q);
    setPage(0);
  }, [q]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchParams({ q: localQuery.trim() });
    }
  };

  // Build the search filter string for Supabase .or()
  const searchFilter = q
    ? `name.ilike.%${q}%,description.ilike.%${q}%,catalog_number.ilike.%${q}%`
    : "";

  // Price bounds for the slider
  const { data: priceBounds } = useQuery({
    queryKey: ["search-price-bounds", q],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("price")
        .eq("is_active", true)
        .or(searchFilter)
        .order("price", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return { min: 0, max: 1000 };
      return {
        min: Math.floor(Number(data[0].price)),
        max: Math.ceil(Number(data[data.length - 1].price)),
      };
    },
    enabled: !!q,
  });

  // Reset price range when bounds change
  useEffect(() => {
    if (priceBounds) {
      setPriceRange([priceBounds.min, priceBounds.max]);
    }
  }, [priceBounds]);

  // Count query for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["search-count", q, inStockOnly, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(searchFilter)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1]);
      if (inStockOnly) query = query.gt("stock", 0);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!q,
  });

  // Products query
  const { data: products, isLoading } = useQuery({
    queryKey: ["search-products", q, sort, inStockOnly, page, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images(url, position)
        `)
        .eq("is_active", true)
        .or(searchFilter)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1])
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (inStockOnly) query = query.gt("stock", 0);

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "name": query = query.order("name", { ascending: true }); break;
        case "rating": query = query.order("avg_rating", { ascending: false }); break;
        case "newest": query = query.order("created_at", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false }); // relevance fallback
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!q,
  });

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={q ? `תוצאות חיפוש: ${q} | יהודיקה` : "חיפוש | יהודיקה"}
        description={q ? `תוצאות חיפוש עבור "${q}"` : "חיפוש מוצרים"}
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">דף הבית</Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">
            {q ? `תוצאות חיפוש עבור "${q}"` : "חיפוש"}
          </span>
        </nav>

        {/* Search input at top of page */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="חיפוש מוצרים..."
              className="pr-10 text-base"
            />
          </div>
          <Button type="submit" variant="gold">
            חפש
          </Button>
        </form>

        {q ? (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              תוצאות חיפוש עבור "{q}"
            </h1>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-4 py-4 border-b border-border">
              <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="מיון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">רלוונטיות</SelectItem>
                  <SelectItem value="newest">חדשים ביותר</SelectItem>
                  <SelectItem value="price_asc">מחיר: נמוך לגבוה</SelectItem>
                  <SelectItem value="price_desc">מחיר: גבוה לנמוך</SelectItem>
                  <SelectItem value="name">שם</SelectItem>
                  <SelectItem value="rating">דירוג</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch id="in-stock" checked={inStockOnly} onCheckedChange={(v) => { setInStockOnly(v); setPage(0); }} />
                <Label htmlFor="in-stock" className="text-sm">במלאי בלבד</Label>
              </div>

              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowFilters((f) => !f)}>
                <SlidersHorizontal className="h-4 w-4" />
                פילטרים
              </Button>

              {totalCount !== undefined && (
                <span className="text-sm text-muted-foreground mr-auto">
                  {totalCount} תוצאות
                </span>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && priceBounds && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
                <Label className="text-sm font-medium">טווח מחירים</Label>
                <Slider
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={1}
                  value={priceRange}
                  onValueChange={(v) => { setPriceRange(v as [number, number]); setPage(0); }}
                />
                <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
                  <span>₪{priceRange[0]}</span>
                  <span>₪{priceRange[1]}</span>
                </div>
              </div>
            )}

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
                      onClick={() => setPage((p) => p - 1)}
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
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">לא נמצאו תוצאות עבור "{q}"</p>
                <p className="text-sm">נסה לחפש במילים אחרות או לבדוק את האיות</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">הקלד מילות חיפוש כדי למצוא מוצרים</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SearchPage;
