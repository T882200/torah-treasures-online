import { ShoppingCart, User, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-elegant">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-bold tracking-wide">
            ספרי <span className="text-accent">קודש</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 font-body text-sm">
            <Link to="/category/torah" className="hover:text-accent transition-colors">תורה</Link>
            <Link to="/category/halacha" className="hover:text-accent transition-colors">הלכה</Link>
            <Link to="/category/mussar" className="hover:text-accent transition-colors">מוסר</Link>
            <Link to="/category/chassidut" className="hover:text-accent transition-colors">חסידות</Link>
            <Link to="/category/kids" className="hover:text-accent transition-colors">ילדים</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent hover:bg-primary/80">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent hover:bg-primary/80">
              <User className="h-5 w-5" />
            </Button>
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:text-accent hover:bg-primary/80">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -left-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  0
                </span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-primary-foreground hover:bg-primary/80"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-2 font-body text-sm border-t border-primary-foreground/20 pt-3">
            <Link to="/category/torah" className="py-2 hover:text-accent transition-colors">תורה</Link>
            <Link to="/category/halacha" className="py-2 hover:text-accent transition-colors">הלכה</Link>
            <Link to="/category/mussar" className="py-2 hover:text-accent transition-colors">מוסר</Link>
            <Link to="/category/chassidut" className="py-2 hover:text-accent transition-colors">חסידות</Link>
            <Link to="/category/kids" className="py-2 hover:text-accent transition-colors">ילדים</Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
