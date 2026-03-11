import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["bg-accent/10", "bg-navy/5", "bg-accent/10", "bg-navy/5", "bg-accent/15"];

const CategoryGrid = () => {
  const { data: categories } = useQuery({
    queryKey: ["category-grid"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, position")
        .is("parent_id", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const cats = categories || [];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl font-bold text-foreground text-center mb-10">
          קטגוריות מובילות
        </h2>
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(cats.length, 5)} gap-4 md:gap-6`}>
          {cats.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link
                to={`/category/${cat.slug}`}
                className={`block ${COLORS[i % COLORS.length]} rounded-lg p-6 md:p-8 text-center hover:shadow-elegant transition-all duration-300 group border border-border`}
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="h-10 w-10 mx-auto mb-4 object-contain group-hover:scale-110 transition-transform" />
                ) : (
                  <BookOpen className="h-10 w-10 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform" />
                )}
                <h3 className="font-display text-lg font-bold text-foreground">
                  {cat.name}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
