import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-xl font-bold mb-4">
              ספרי <span className="text-accent">קודש</span>
            </h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              החנות המובילה לספרי קודש, ספרי הלכה, מוסר וחסידות. משלוחים לכל הארץ.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold mb-4">קישורים</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/" className="hover:text-accent transition-colors">דף הבית</Link></li>
              <li><Link to="/category/new" className="hover:text-accent transition-colors">חדשים</Link></li>
              <li><Link to="/category/bestsellers" className="hover:text-accent transition-colors">רבי מכר</Link></li>
              <li><Link to="/account" className="hover:text-accent transition-colors">החשבון שלי</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-display font-bold mb-4">שירות לקוחות</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>משלוחים והחזרות</li>
              <li>תנאי שימוש</li>
              <li>מדיניות פרטיות</li>
              <li>שאלות נפוצות</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold mb-4">צרו קשר</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span dir="ltr">03-1234567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <span>info@sifrei-kodesh.co.il</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span>בני ברק, ישראל</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} ספרי קודש. כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
