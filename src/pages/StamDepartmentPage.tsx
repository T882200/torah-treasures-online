import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import ProductCard from "@/components/storefront/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Shield, BookOpen, PenTool, Package, Star } from "lucide-react";

const STAM_SUBCATEGORIES = [
  { name: "תפילין", slug: "tefillin", icon: Shield, desc: "גסות, דקות, פשוטים מהודרים, בר מצווה" },
  { name: "מזוזות", slug: "mezuzot", icon: ScrollText, desc: "אשכנזי, ספרדי, חב\"ד, אריז\"ל" },
  { name: "ספרי תורה", slug: "sifrei-torah", icon: BookOpen, desc: "חדשים, משומשים, תיקונים, אותיות" },
  { name: "מגילות", slug: "megillot", icon: PenTool, desc: "אסתר, שיר השירים, רות, קהלת, איכה" },
  { name: "ציוד סופרים", slug: "sofer-supplies", icon: Package, desc: "קלפים, דיו, קולמוסים" },
  { name: "תשמישי קדושה", slug: "tashmishei-kedusha", icon: Star, desc: "בתי מזוזה, תיקי תפילין, עצי חיים" },
];

const StamDepartmentPage = () => {
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ["stam-featured"],
    queryFn: async () => {
      // Get products that belong to any stam-related category
      const stamSlugs = STAM_SUBCATEGORIES.map(c => c.slug);
      const { data: cats } = await supabase
        .from("categories")
        .select("id")
        .in("slug", stamSlugs);

      if (!cats?.length) {
        // Fallback: get any recent products  
        const { data, error } = await supabase
          .from("products")
          .select("id, name, slug, price, price_raw, in_stock, product_images(url, position)")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(8);
        if (error) throw error;
        return data;
      }

      const catIds = cats.map(c => c.id);
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, slug, price, price_raw, in_stock,
          product_images(url, position),
          product_categories!inner(category_id)
        `)
        .eq("is_active", true)
        .in("product_categories.category_id", catIds)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const { data: dbCategories } = useQuery({
    queryKey: ["stam-db-categories"],
    queryFn: async () => {
      const slugs = STAM_SUBCATEGORIES.map(c => c.slug);
      const { data } = await supabase
        .from("categories")
        .select("slug, id")
        .in("slug", slugs);
      return data || [];
    },
  });
  const existingCategorySlugs = new Set(dbCategories?.map(c => c.slug) || []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative bg-primary text-primary-foreground py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ScrollText className="h-16 w-16 mx-auto mb-6 text-accent" />
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              מחלקת סת״ם
            </h1>
            <p className="font-body text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
              ספרי תורה • תפילין • מזוזות • מגילות
              <br />
              כתב יד מהודר, בהשגחת בד״ץ, עם תעודת הכשר לכל מוצר
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "בדיקת מחשב + ידנית", icon: "🔍" },
              { label: "תעודת הכשר לכל מוצר", icon: "📜" },
              { label: "כתב יד מהודר", icon: "✍️" },
              { label: "משלוח מבוטח", icon: "📦" },
            ].map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs md:text-sm font-medium text-foreground">{badge.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Subcategories Grid */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
          קטגוריות סת״ם
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-16">
          {STAM_SUBCATEGORIES.map((cat, i) => {
            const exists = existingCategorySlugs.has(cat.slug);
            const Comp = exists ? Link : "div";
            const props = exists ? { to: `/category/${cat.slug}` } : {};
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Comp
                  {...(props as any)}
                  className="block bg-card rounded-lg p-6 md:p-8 text-center hover:shadow-elegant transition-all duration-300 group border border-border cursor-pointer"
                >
                  <cat.icon className="h-10 w-10 mx-auto mb-3 text-accent group-hover:scale-110 transition-transform" />
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </Comp>
              </motion.div>
            );
          })}
        </div>

        {/* Featured Products */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
          מוצרי סת״ם מובחרים
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : featuredProducts && featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                price={Number(p.price)}
                priceRaw={p.price_raw ? Number(p.price_raw) : undefined}
                imageUrl={p.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0]?.url}
                inStock={p.in_stock ?? true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>מוצרי סת״ם יופיעו כאן בקרוב.</p>
          </div>
        )}

        {/* Info Section */}
        <section className="mt-16 bg-card rounded-lg border border-border p-8 md:p-12">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 text-center">
            על מוצרי הסת״ם שלנו
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed font-body">
            <div>
              <h3 className="font-display font-bold text-foreground mb-2">רמות כשרות</h3>
              <p className="mb-4">
                כל מוצרי הסת״ם שלנו מוצעים ברמות כשרות מוגדרות: <strong>כשר</strong>, <strong>מהודר</strong>, 
                ו<strong>מהודר מן המהודר</strong>. כל מוצר עובר בדיקה ידנית ע"י סופר מומחה וכן בדיקת מחשב.
              </p>
              <h3 className="font-display font-bold text-foreground mb-2">נוסחאות וכתבים</h3>
              <p>
                אנו מציעים את כל הנוסחאות: אשכנזי (בית יוסף), ספרדי (וועליש), חב"ד (אר"י), תימני, ועוד.
              </p>
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground mb-2">תעודת הכשר</h3>
              <p className="mb-4">
                כל מוצר סת"ם מגיע עם תעודת הכשר מפורטת, הכוללת שם הסופר, שם המשגיח, ובד"ץ מפקח.
                ניתן לראות את פרטי ההכשר בדף המוצר.
              </p>
              <h3 className="font-display font-bold text-foreground mb-2">אחריות ושירות</h3>
              <p>
                אנו מציעים בדיקת סת"ם חוזרת, תיקונים מקצועיים, ושירות לקוחות מקיף לכל מוצרי הסת"ם.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StamDepartmentPage;
