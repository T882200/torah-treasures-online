import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface BannerSliderProps {
  config: any;
}

const BannerSlider = ({ config }: BannerSliderProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const bannerIds: string[] = config.banner_ids || [];

  const { data: banners } = useQuery({
    queryKey: ["banner-slider", bannerIds],
    queryFn: async () => {
      if (bannerIds.length === 0) {
        // If no specific banners selected, show all active ones
        const { data, error } = await supabase
          .from("promo_banners")
          .select("*")
          .eq("is_active", true)
          .order("position");
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .in("id", bannerIds)
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  const banner = banners[currentSlide];

  const content = (
    <div
      className="relative rounded-lg overflow-hidden min-h-[200px] md:min-h-[300px] flex items-center justify-center transition-all duration-500"
      style={{
        backgroundColor: banner.bg_color || "#1a2744",
        color: banner.text_color || "#f5f0e8",
      }}
    >
      {banner.image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${banner.image_url})` }}
        />
      )}
      <div className="relative z-10 text-center p-8">
        <h2 className="font-display text-2xl md:text-4xl font-bold mb-2">{banner.title}</h2>
        {banner.subtitle && <p className="font-body text-lg opacity-80">{banner.subtitle}</p>}
      </div>
      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length); }}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev + 1) % banners.length); }}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_: any, i: number) => (
              <button
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentSlide ? "bg-white" : "bg-white/40"}`}
                onClick={(e) => { e.preventDefault(); setCurrentSlide(i); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {banner.link_url ? <Link to={banner.link_url}>{content}</Link> : content}
      </div>
    </section>
  );
};

export default BannerSlider;
