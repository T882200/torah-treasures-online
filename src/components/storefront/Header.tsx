import { ShoppingCart, User, Menu, LogOut, Shield, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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

// ─── Category Groups (frontend-only hierarchy) ───
// Maps parent group labels to the category names that belong under them.
// This doesn't change the DB — only how categories display in the header bar.
const CATEGORY_GROUPS: {
  label: string;
  icon: string;
  subcategories: string[];
}[] = [
  {
    label: "סידורים",
    icon: "📖",
    subcategories: ["סידורים", "ברכונים", "זמירות שבת", "פיטום הקטורת וברכת כלה"],
  },
  {
    label: "ספרי קודש",
    icon: "📚",
    subcategories: ["מחזורים", "מחזורים ותהילים", "תהילים"],
  },
  {
    label: "תשמישי קדושה",
    icon: "✡️",
    subcategories: [
      "טליתות",
      "טליתות מנורה",
      "ציציות",
      "כיפות",
      "כיסוים לטלית ותפילין",
      "מכסאות לתפילין",
      "עטרות",
    ],
  },
  {
    label: "מוצרי סת\"ם",
    icon: "🖊️",
    subcategories: ["רצועות ומוצרי סת\"ם", "מזוזות"],
  },
  {
    label: "מזכרות ולבית",
    icon: "🎁",
    subcategories: [
      "הדלקת נרות וסדר הבדלה",
      "פמוטים",
      "כיסוי חלה ופלטה",
      "מעוצבות ועבודת יד",
      "תיקים ומזוודות",
    ],
  },
  {
    label: "שונות",
    icon: "📦",
    subcategories: ["שונות", "מבצעים", "חגים"],
  },
];

type CategoryRow = { id: string; name: string; slug: string; position: number | null };

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch ALL categories (not just parent_id = null)
  const { data: categories } = useQuery({
    queryKey: ["header-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, position")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as CategoryRow[];
    },
    staleTime: 5 * 60_000,
  });

  // Build a lookup: category name → { slug, id }
  const catMap = useMemo(() => {
    const map: Record<string, CategoryRow> = {};
    (categories || []).forEach((c) => {
      map[c.name] = c;
    });
    return map;
  }, [categories]);

  // For each group, resolve which subcategories actually exist in the DB
  const resolvedGroups = useMemo(() => {
    return CATEGORY_GROUPS.map((g) => ({
      ...g,
      items: g.subcategories
        .map((name) => catMap[name])
        .filter(Boolean) as CategoryRow[],
    }));
  }, [catMap]);

  // Desktop hover handlers with a small delay to prevent flicker
  const handleMouseEnter = (label: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenGroup(label);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpenGroup(null), 150);
  };

  // Mobile accordion toggle
  const toggleMobileGroup = (label: string) => {
    setMobileExpandedGroup((prev) => (prev === label ? null : label));
  };

  return (
    <header className="sticky top-0 z-50 shadow-elegant">
      {/* ─── Top bar: logo + controls ─── */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="font-display text-2xl font-bold tracking-wide">
              ספרי <span className="text-accent">קודש</span>
            </Link>

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
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setMobileExpandedGroup(null);
                }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop category mega-menu bar ─── */}
      <nav className="hidden md:block bg-primary/90 text-primary-foreground border-t border-primary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-0">
            {resolvedGroups.map((group) => (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(group.label)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`
                    flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                    transition-all duration-200 hover:bg-primary-foreground/10 hover:text-accent
                    ${openGroup === group.label ? "bg-primary-foreground/10 text-accent" : ""}
                  `}
                  onClick={() => {
                    // If group has exactly 1 subcategory with same name, navigate directly
                    if (group.items.length === 1 && group.items[0].name === group.label) {
                      navigate(`/category/${group.items[0].slug}`);
                    }
                  }}
                >
                  <span className="text-base leading-none">{group.icon}</span>
                  <span>{group.label}</span>
                  {group.items.length > 1 && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        openGroup === group.label ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown panel */}
                {openGroup === group.label && group.items.length > 0 && (
                  <div
                    className="absolute top-full right-0 min-w-[220px] bg-white text-foreground rounded-b-lg shadow-xl border border-border/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                    onMouseEnter={() => handleMouseEnter(group.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="py-2">
                      {group.items.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.slug}`}
                          className="block px-4 py-2.5 text-sm hover:bg-accent/10 hover:text-accent transition-colors"
                          onClick={() => setOpenGroup(null)}
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* ─── Mobile menu (accordion-style) ─── */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-primary text-primary-foreground border-t border-primary-foreground/20 max-h-[70vh] overflow-y-auto">
          <div className="container mx-auto px-4 py-2">
            {resolvedGroups.map((group) => (
              <div key={group.label} className="border-b border-primary-foreground/10 last:border-b-0">
                <button
                  className="flex items-center justify-between w-full py-3 text-sm font-medium hover:text-accent transition-colors"
                  onClick={() => toggleMobileGroup(group.label)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{group.icon}</span>
                    <span>{group.label}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileExpandedGroup === group.label ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mobileExpandedGroup === group.label && (
                  <div className="pb-2 pr-6 animate-in fade-in slide-in-from-top-1 duration-150">
                    {group.items.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        className="block py-2 text-sm text-primary-foreground/80 hover:text-accent transition-colors"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileExpandedGroup(null);
                        }}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
