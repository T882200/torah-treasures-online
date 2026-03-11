import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroFallback from "@/assets/hero-books.jpg";
import CategoryGrid from "./CategoryGrid";
import ProductCarousel from "./ProductCarousel";
import NewsletterSignup from "./NewsletterSignup";
import FeaturedProductsSection from "./FeaturedProductsSection";
import VideoSection from "./VideoSection";
import BannerSlider from "./BannerSlider";

const DynamicHomepage = () => {
  const { data: sections } = useQuery({
    queryKey: ["homepage-sections-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (!sections) return null;

  return (
    <>
      {sections.map((section: any) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
};

const SectionRenderer = ({ section }: { section: any }) => {
  const config = section.config || {};

  switch (section.type) {
    case "hero":
      return <HeroSection config={config} />;
    case "categories":
      return <CategoryGrid />;
    case "product_carousel":
      return <CarouselSection title={section.title} config={config} />;
    case "promo_banner":
      return <PromoBannerSection config={config} />;
    case "newsletter":
      return <NewsletterSignup />;
    case "text_block":
      return <TextBlockSection config={config} />;
    case "image_text":
      return <ImageTextSection config={config} />;
    case "trust_badges":
      return <TrustBadgesSection config={config} />;
    case "testimonials":
      return <TestimonialsSection config={config} />;
    case "featured_products":
      return <FeaturedProductsSection title={section.title} config={config} />;
    case "video":
      return <VideoSection config={config} />;
    case "banner_slider":
      return <BannerSlider config={config} />;
    default:
      return null;
  }
};

const HeroSection = ({ config }: { config: any }) => {
  const bgImage = config.image_url || heroFallback;

  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="absolute inset-0 bg-gradient-to-l from-primary/90 via-primary/70 to-primary/40" />
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-lg">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-4">
            {config.heading || "ברוכים הבאים"}
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 font-body leading-relaxed">
            {config.subheading || ""}
          </p>
          <div className="flex gap-4">
            {config.cta_text && (
              <Link to={config.cta_link || "/"}>
                <Button variant="hero" size="lg">{config.cta_text}</Button>
              </Link>
            )}
            {config.cta2_text && (
              <Link to={config.cta2_link || "/"}>
                <Button variant="navyOutline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  {config.cta2_text}
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const CarouselSection = ({ title, config }: { title: string; config: any }) => {
  const queryType = config.query_type || "new_arrivals";
  const limit = config.limit || 8;

  const { data: products } = useQuery({
    queryKey: ["homepage-carousel", queryType, limit],
    queryFn: async () => {
      const query = supabase
        .from("products")
        .select("id, name, slug, price, price_raw, in_stock, product_images(url, position)")
        .eq("is_active", true)
        .limit(limit);

      if (queryType === "new_arrivals") {
        query.order("created_at", { ascending: false });
      } else {
        query.order("created_at", { ascending: true });
      }

      const { data, error } = await query;
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
  });

  if (!products || products.length === 0) return null;
  return <ProductCarousel title={title} products={products} />;
};

const PromoBannerSection = ({ config }: { config: any }) => (
  <section className="py-8">
    <div className="container mx-auto px-4">
      <div className="gradient-navy rounded-lg p-8 md:p-12 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
          {config.heading || ""}
        </h2>
        <p className="text-primary-foreground/70 font-body">{config.subheading || ""}</p>
      </div>
    </div>
  </section>
);

const TextBlockSection = ({ config }: { config: any }) => (
  <section className="py-12">
    <div className="container mx-auto px-4">
      <div className={`max-w-3xl mx-auto text-${config.alignment || "center"}`}>
        <p className="text-foreground font-body text-lg leading-relaxed whitespace-pre-wrap">{config.content || ""}</p>
      </div>
    </div>
  </section>
);

const ImageTextSection = ({ config }: { config: any }) => (
  <section className="py-12">
    <div className="container mx-auto px-4">
      <div className={`flex flex-col md:flex-row gap-8 items-center ${config.image_side === "left" ? "md:flex-row-reverse" : ""}`}>
        {config.image_url && (
          <div className="w-full md:w-1/2">
            <img src={config.image_url} alt="" className="rounded-lg w-full object-cover" />
          </div>
        )}
        <div className="w-full md:w-1/2 space-y-4">
          <h2 className="font-display text-3xl font-bold text-foreground">{config.heading || ""}</h2>
          <p className="text-muted-foreground font-body leading-relaxed">{config.body || ""}</p>
        </div>
      </div>
    </div>
  </section>
);

const TrustBadgesSection = ({ config }: { config: any }) => {
  const items = config.items || [];
  return (
    <section className="py-10 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="text-center">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="font-display font-bold text-foreground mt-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = ({ config }: { config: any }) => {
  const items = config.items || [];
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">מה הלקוחות אומרים</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-card border border-border">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: item.rating || 5 }).map((_, j) => (
                  <span key={j} className="text-accent">★</span>
                ))}
              </div>
              <p className="text-foreground font-body mb-4">"{item.text}"</p>
              <p className="text-sm font-bold text-muted-foreground">— {item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DynamicHomepage;
