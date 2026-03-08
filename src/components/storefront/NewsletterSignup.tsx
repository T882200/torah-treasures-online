import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { toast } from "sonner";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("תודה! נרשמת בהצלחה לניוזלטר.");
      setEmail("");
    }
  };

  return (
    <section className="py-16 bg-secondary">
      <div className="container mx-auto px-4 text-center max-w-xl">
        <Mail className="h-10 w-10 mx-auto mb-4 text-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
          הישארו מעודכנים
        </h2>
        <p className="text-muted-foreground mb-6 font-body">
          הירשמו לניוזלטר שלנו וקבלו עדכונים על מוצרים חדשים ומבצעים מיוחדים.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="הכניסו כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background"
            required
          />
          <Button variant="gold" type="submit">
            הרשמה
          </Button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterSignup;
