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
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, slug, price, product_images(url, position)")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,catalog_number.ilike.%${query}%`)
          .limit(8);
        if (error) {
          console.error("Search error:", error);
          // Fallback: simpler query without OR
          const { data: fallback } = await supabase
            .from("products")
            .select("id, name, slug, price, product_images(url, position)")
            .ilike("name", `%${query}%`)
            .limit(8);
          setResults(fallback || []);
        } else {
          setResults(data || []);
        }
      } catch (err) {
        console.error("Search exception:", err);
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

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
              className="fixed inset-x-0 top-0 sm:top-16 w-full sm:w-[90vw] sm:max-w-lg mx-auto z-[101]"
            >
              <div className="bg-white rounded-none sm:rounded-lg border-0 sm:border sm:border-gray-200 shadow-2xl overflow-hidden min-h-[50vh] sm:min-h-0" dir="rtl">
                <div className="flex items-center gap-3 p-4 sm:p-3 border-b border-gray-200">
                  <Search className="h-5 w-5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="חיפוש מוצרים..."
                    className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-base text-gray-900 placeholder:text-gray-400"
                  />
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  <button onClick={() => setOpen(false)} className="p-1">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {results.length > 0 && (
                  <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
                    {results.map((product) => {
                      const img = product.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleSelect(product.slug)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-right border-b border-gray-100 last:border-b-0"
                        >
                          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {img?.url ? (
                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">—</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 font-medium">₪{Number(product.price).toFixed(2)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {query.trim() && !loading && results.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    לא נמצאו מוצרים עבור "{query}"
                  </div>
                )}

                <div className="p-2 border-t border-gray-200 text-center">
                  <span className="text-xs text-gray-400">⌘K לחיפוש מהיר</span>
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
