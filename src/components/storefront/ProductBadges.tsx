import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductBadgesProps {
  productId: string;
}

const cornerClasses: Record<string, string> = {
  "top-right": "top-2 right-2",
  "top-left": "top-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "bottom-left": "bottom-2 left-2",
};

const ProductBadges = ({ productId }: ProductBadgesProps) => {
  const { data: badges } = useQuery({
    queryKey: ["product-badges", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_badge_assignments")
        .select("badge_id, product_badges(*)")
        .eq("product_id", productId);
      if (error) throw error;
      return data?.map((a: any) => a.product_badges).filter(Boolean) || [];
    },
    staleTime: 60_000,
  });

  if (!badges || badges.length === 0) return null;

  return (
    <>
      {badges.map((badge: any) => (
        <div
          key={badge.id}
          className={`absolute z-10 ${cornerClasses[badge.corner] || cornerClasses["top-right"]}`}
        >
          {badge.type === "text" ? (
            <span
              className="px-2 py-1 rounded text-xs font-bold shadow-sm"
              style={{ backgroundColor: badge.bg_color, color: badge.text_color }}
            >
              {badge.label}
            </span>
          ) : badge.image_url ? (
            <img src={badge.image_url} alt={badge.name} className="h-10 w-auto" />
          ) : null}
        </div>
      ))}
    </>
  );
};

export default ProductBadges;
