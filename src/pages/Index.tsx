import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import HeroBanner from "@/components/storefront/HeroBanner";
import CategoryGrid from "@/components/storefront/CategoryGrid";
import ProductCarousel from "@/components/storefront/ProductCarousel";
import NewsletterSignup from "@/components/storefront/NewsletterSignup";

// Mock data - will be replaced with Supabase queries
const mockNewArrivals = [
  { id: "1", name: "משנה ברורה - מהדורה חדשה", slug: "mishna-berura-new", price: 89.90, priceRaw: 120.00 },
  { id: "2", name: "שולחן ערוך - אורח חיים", slug: "shulchan-aruch-oc", price: 65.00 },
  { id: "3", name: "תניא עם פירוש מורחב", slug: "tanya-expanded", price: 55.00, priceRaw: 70.00 },
  { id: "4", name: "ספר חסידים - מהדורת כיס", slug: "sefer-chasidim-pocket", price: 35.00 },
  { id: "5", name: "מסילת ישרים - מהדורה מבוארת", slug: "mesilat-yesharim", price: 42.00 },
  { id: "6", name: "חפץ חיים - שמירת הלשון", slug: "chafetz-chaim", price: 38.00, priceRaw: 48.00 },
  { id: "7", name: "נועם אלימלך", slug: "noam-elimelech", price: 52.00 },
  { id: "8", name: "ליקוטי מוהר״ן", slug: "likutei-moharan", price: 75.00 },
];

const mockBestSellers = [
  { id: "9", name: "תלמוד בבלי - מסכת ברכות", slug: "talmud-berachot", price: 95.00 },
  { id: "10", name: "חומש עם רש״י - בראשית", slug: "chumash-rashi-bereishit", price: 48.00 },
  { id: "11", name: "סידור תפילה - נוסח אשכנז", slug: "siddur-ashkenaz", price: 32.00 },
  { id: "12", name: "הלכות שבת - שמירת שבת כהלכתה", slug: "shmirat-shabbat", price: 78.00, priceRaw: 95.00 },
  { id: "13", name: "קיצור שולחן ערוך", slug: "kitzur-shulchan-aruch", price: 45.00 },
  { id: "14", name: "פרקי אבות מבואר", slug: "pirkei-avot", price: 28.00 },
  { id: "15", name: "זוהר הקדוש - כרך א׳", slug: "zohar-vol-1", price: 110.00 },
  { id: "16", name: "שערי תשובה", slug: "shaarei-teshuva", price: 36.00 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HeroBanner />
        <CategoryGrid />
        <ProductCarousel title="חדשים בחנות" products={mockNewArrivals} />
        
        {/* Promo Banner */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="gradient-navy rounded-lg p-8 md:p-12 text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                משלוח חינם מעל ₪200
              </h2>
              <p className="text-primary-foreground/70 font-body">
                לכל רחבי הארץ • משלוח תוך 3-5 ימי עסקים
              </p>
            </div>
          </div>
        </section>

        <ProductCarousel title="רבי מכר" products={mockBestSellers} />
        <NewsletterSignup />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
