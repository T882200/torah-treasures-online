import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-books.jpg";

const HeroBanner = () => {
  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-primary/90 via-primary/70 to-primary/40" />

      <div className="relative container mx-auto px-4 h-full flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-lg"
        >
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-4">
            עולם של <span className="text-accent">ספרות קודש</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 font-body leading-relaxed">
            אלפי ספרי תורה, הלכה, מוסר וחסידות במקום אחד. משלוח חינם מעל ₪200.
          </p>
          <div className="flex gap-4">
            <Link to="/category/new">
              <Button variant="hero" size="lg">
                חדשים בחנות
              </Button>
            </Link>
            <Link to="/category/bestsellers">
              <Button variant="navyOutline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                רבי מכר
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
