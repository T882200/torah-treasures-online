import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Scale, Heart, Sparkles } from "lucide-react";

const categories = [
  { name: "תורה ומפרשים", slug: "torah", icon: BookOpen, color: "bg-accent/10" },
  { name: "הלכה ושו״ת", slug: "halacha", icon: Scale, color: "bg-navy/5" },
  { name: "מוסר והשקפה", slug: "mussar", icon: Heart, color: "bg-accent/10" },
  { name: "חסידות וקבלה", slug: "chassidut", icon: Sparkles, color: "bg-navy/5" },
];

const CategoryGrid = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl font-bold text-foreground text-center mb-10">
          קטגוריות מובילות
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link
                to={`/category/${cat.slug}`}
                className={`block ${cat.color} rounded-lg p-6 md:p-8 text-center hover:shadow-elegant transition-all duration-300 group border border-border`}
              >
                <cat.icon className="h-10 w-10 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform" />
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
