import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, product_images(url, position)")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(8);
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (slug: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/product/${slug}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-primary-foreground hover:text-accent transition-colors p-2 rounded-md hover:bg-primary-foreground/10"
        aria-label="חיפוש"
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[100]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-lg z-[101]"
            >
              <div className="bg-card rounded-lg border border-border shadow-elegant overflow-hidden">
                <div className="flex items-center gap-3 p-3 border-b border-border">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="חיפוש מוצרים..."
                    className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-base"
                  />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <button onClick={() => setOpen(false)}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {results.length > 0 && (
                  <div className="max-h-80 overflow-y-auto">
                    {results.map((product) => {
                      const img = product.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleSelect(product.slug)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
                        >
                          <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                            {img?.url ? (
                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">₪{Number(product.price).toFixed(2)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {query.trim() && !loading && results.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    לא נמצאו מוצרים עבור "{query}"
                  </div>
                )}

                <div className="p-2 border-t border-border text-center">
                  <span className="text-xs text-muted-foreground">⌘K לחיפוש מהיר</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalSearch;
