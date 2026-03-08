import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageItem {
  id: string;
  url: string;
  alt_text?: string | null;
  is_video?: boolean | null;
}

interface ProductImageGalleryProps {
  images: ImageItem[];
  productName: string;
}

const ProductImageGallery = ({ images, productName }: ProductImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [useSimpleMode, setUseSimpleMode] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if we should use simple mode (mobile, low-end device, or reduced motion preference)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;
    // Simple heuristic for low-end devices: check hardwareConcurrency
    const isLowEnd = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;

    if (prefersReducedMotion || isMobile || isLowEnd) {
      setUseSimpleMode(true);
    }
  }, []);

  const goTo = useCallback((index: number) => {
    setDirection(index > selectedIndex ? 1 : -1);
    setSelectedIndex(index);
  }, [selectedIndex]);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(1);
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(-1);
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Touch/swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      // RTL: swipe directions are inverted
      if (diff > 0) goPrev();
      else goNext();
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
        אין תמונה
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  // Simple mode: no animations, just crossfade
  if (useSimpleMode) {
    return (
      <div className="space-y-3">
        <div
          className="aspect-square bg-muted rounded-lg overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {imageErrors.has(selectedIndex) ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              שגיאה בטעינת תמונה
            </div>
          ) : (
            <img
              key={currentImage.id}
              src={currentImage.url}
              alt={currentImage.alt_text || productName}
              className="w-full h-full object-contain transition-opacity duration-300"
              onError={() => handleImageError(selectedIndex)}
              loading="eager"
            />
          )}

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-sm"
                aria-label="הבא"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-sm"
                aria-label="הקודם"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dots indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === selectedIndex ? "bg-accent w-4" : "bg-background/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => goTo(i)}
                className={`w-16 h-16 rounded-md border-2 overflow-hidden flex-shrink-0 transition-all ${
                  i === selectedIndex ? "border-accent shadow-sm" : "border-border opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Enhanced mode: framer-motion animations
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="aspect-square bg-muted rounded-lg overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={currentImage.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="absolute inset-0"
          >
            {imageErrors.has(selectedIndex) ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                שגיאה בטעינת תמונה
              </div>
            ) : (
              <img
                src={currentImage.url}
                alt={currentImage.alt_text || productName}
                className="w-full h-full object-contain"
                onError={() => handleImageError(selectedIndex)}
                loading="eager"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-elegant z-10"
              aria-label="הבא"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-elegant z-10"
              aria-label="הקודם"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Animated dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="relative"
              >
                <motion.div
                  className="rounded-full bg-background/60"
                  animate={{
                    width: i === selectedIndex ? 20 : 8,
                    height: 8,
                    backgroundColor: i === selectedIndex ? "hsl(var(--accent))" : "hsl(var(--background) / 0.6)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails with active indicator */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <motion.button
              key={img.id}
              onClick={() => goTo(i)}
              className={`w-16 h-16 rounded-md border-2 overflow-hidden flex-shrink-0 transition-colors ${
                i === selectedIndex ? "border-accent" : "border-border"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ opacity: i === selectedIndex ? 1 : 0.6 }}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
