import { ShoppingCart, User, Menu, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalSearch from "./GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ["header-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, position")
        .is("parent_id", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const navCategories = categories || [];

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-elegant">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-display text-2xl font-bold tracking-wide">
            ספרי <span className="text-accent">קודש</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-body text-sm">
            {navCategories.map((cat) => (
              <Link key={cat.id} to={`/category/${cat.slug}`} className="hover:text-accent transition-colors">
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <GlobalSearch />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent hover:bg-primary/80">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">החשבון שלי</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        פאנל ניהול
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer flex items-center gap-2">
                    <LogOut className="h-3 w-3" />
                    התנתק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:text-accent hover:bg-primary/80">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:text-accent hover:bg-primary/80">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -left-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
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

        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-2 font-body text-sm border-t border-primary-foreground/20 pt-3">
            {navCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="py-2 hover:text-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
