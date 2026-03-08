import { Link } from "react-router-dom";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCart();

  const shippingCost = subtotal >= 200 ? 0 : 25;
  const total = subtotal + shippingCost;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold mb-4">העגלה ריקה</h1>
          <p className="text-muted-foreground mb-6">הוסיפו מוצרים לעגלה כדי להמשיך</p>
          <Link to="/">
            <Button variant="gold" size="lg">חזרה לחנות</Button>
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
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          עגלת קניות ({totalItems} פריטים)
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex gap-4 p-4 bg-card rounded-lg border border-border shadow-card">
                <div className="w-20 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      אין תמונה
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">{item.name}</h3>
                  {item.variantLabel && (
                    <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  )}
                  <p className="font-bold text-foreground mt-1">₪{item.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center border border-border rounded-md">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      className="p-1.5 hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      className="p-1.5 hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    ₪{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-card h-fit sticky top-24">
            <h2 className="font-display font-bold text-lg mb-4">סיכום הזמנה</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">סכום ביניים</span>
                <span className="font-medium">₪{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">משלוח</span>
                <span className="font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">חינם!</span>
                  ) : (
                    `₪${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
              {subtotal < 200 && (
                <p className="text-xs text-accent">
                  הוסיפו עוד ₪{(200 - subtotal).toFixed(2)} למשלוח חינם!
                </p>
              )}
              <div className="border-t border-border pt-3 flex justify-between text-base font-bold">
                <span>סה״כ</span>
                <span>₪{total.toFixed(2)}</span>
              </div>
            </div>
            <Link to="/checkout" className="block mt-6">
              <Button variant="gold" size="lg" className="w-full">
                המשך לתשלום
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
