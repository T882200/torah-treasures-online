import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import ProductImageGallery from "@/components/storefront/ProductImageGallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ChevronLeft, Minus, Plus } from "lucide-react";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(id, url, position, alt_text, is_video),
          product_variants(id, variant_label, variant_value, price_override, stock, sku),
          product_categories(category_id, categories:category_id(name, slug))
        `)
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const images = product?.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)) || [];
  const variants = product?.product_variants || [];
  const categories = product?.product_categories || [];

  const activeVariant = variants.find((v: any) => v.id === selectedVariant);
  const displayPrice = activeVariant?.price_override ? Number(activeVariant.price_override) : product ? Number(product.price) : 0;
  const isInStock = activeVariant ? (activeVariant.stock || 0) > 0 : (product?.in_stock ?? false);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant,
      name: product.name + (activeVariant ? ` - ${activeVariant.variant_value}` : ""),
      variantLabel: activeVariant?.variant_label,
      price: displayPrice,
      imageUrl: images[0]?.url,
    }, quantity);
  };

  // Group variants by label
  const variantGroups: Record<string, typeof variants> = {};
  variants.forEach((v: any) => {
    if (!variantGroups[v.variant_label]) variantGroups[v.variant_label] = [];
    variantGroups[v.variant_label].push(v);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">מוצר לא נמצא</h1>
          <Link to="/">
            <Button variant="gold">חזרה לדף הבית</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">דף הבית</Link>
          {categories[0] && (
            <>
              <ChevronLeft className="h-3 w-3" />
              <Link
                to={`/category/${(categories[0] as any).categories?.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {(categories[0] as any).categories?.name}
              </Link>
            </>
          )}
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <ProductImageGallery images={images} productName={product.name} />

          {/* Product Info */}
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {product.name}
            </h1>

            {(product.catalog_number || product.barcode) && (
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                {product.catalog_number && <span>מק״ט: {product.catalog_number}</span>}
                {product.barcode && <span>ברקוד: {product.barcode}</span>}
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <span className="font-body text-3xl font-bold text-foreground">₪{displayPrice.toFixed(2)}</span>
              {product.price_raw && Number(product.price_raw) !== displayPrice && (
                <span className="font-body text-lg text-muted-foreground line-through">
                  ₪{Number(product.price_raw).toFixed(2)}
                </span>
              )}
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6 ${
              isInStock ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isInStock ? "bg-green-500" : "bg-destructive"}`} />
              {isInStock ? "במלאי" : "אזל מהמלאי"}
            </div>

            {/* Variants */}
            {Object.entries(variantGroups).map(([label, items]) => (
              <div key={label} className="mb-4">
                <span className="text-sm font-medium text-foreground mb-2 block">{label}</span>
                <div className="flex flex-wrap gap-2">
                  {(items as any[]).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id === selectedVariant ? undefined : v.id)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                        v.id === selectedVariant
                          ? "border-accent bg-accent/10 text-accent-foreground"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {v.variant_value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-md">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-muted transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="gold"
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={!isInStock}
              >
                <ShoppingCart className="h-5 w-5" />
                הוסף לעגלה
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-border pt-6">
                <h3 className="font-display font-bold text-lg mb-3">תיאור המוצר</h3>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductPage;
