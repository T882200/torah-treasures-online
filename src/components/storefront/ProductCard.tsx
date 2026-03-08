import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProductBadges from "./ProductBadges";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceRaw?: number;
  imageUrl?: string;
  inStock?: boolean;
}

const ProductCard = ({ id, name, slug, price, priceRaw, imageUrl, inStock = true }: ProductCardProps) => {
  const { addItem } = useCart();
  const formattedPrice = `₪${price.toFixed(2)}`;
  const formattedRawPrice = priceRaw ? `₪${priceRaw.toFixed(2)}` : null;

  return (
    <Link to={`/product/${slug}`} className="group block">
      <div className="bg-card rounded-lg overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 border border-border">
        <div className="aspect-[3/4] bg-muted overflow-hidden relative">
          <ProductBadges productId={id} />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <BookPlaceholder />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display font-bold text-foreground text-sm leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-body font-bold text-lg text-foreground">{formattedPrice}</span>
            {formattedRawPrice && (
              <span className="font-body text-sm text-muted-foreground line-through">{formattedRawPrice}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-body ${inStock ? 'text-green-600' : 'text-destructive'}`}>
              {inStock ? 'במלאי' : 'אזל מהמלאי'}
            </span>
            <Button
              variant="gold"
              size="sm"
              className="gap-1"
              disabled={!inStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem({ productId: id, name, price, imageUrl });
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              הוסף
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

const BookPlaceholder = () => (
  <svg className="h-16 w-12 text-muted-foreground/40" viewBox="0 0 48 64" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="36" height="56" rx="2" />
    <line x1="12" y1="14" x2="32" y2="14" />
    <line x1="12" y1="22" x2="28" y2="22" />
    <line x1="12" y1="30" x2="30" y2="30" />
  </svg>
);

export default ProductCard;
