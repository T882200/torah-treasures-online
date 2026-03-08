import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, ArrowRight } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { label: "דשבורד", icon: LayoutDashboard, href: "/admin" },
  { label: "מוצרים", icon: Package, href: "/admin/products" },
  { label: "הזמנות", icon: ShoppingCart, href: "/admin/orders" },
  { label: "לקוחות", icon: Users, href: "/admin/customers" },
];

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-foreground flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-primary-foreground/20">
          <Link to="/admin" className="font-display text-xl font-bold">
            ספרי <span className="text-accent">קודש</span>
          </Link>
          <p className="text-xs text-primary-foreground/60 mt-1">פאנל ניהול</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-primary-foreground/20">
          <Link to="/" className="flex items-center gap-2 text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors">
            <ArrowRight className="h-3 w-3" />
            חזרה לחנות
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
          {/* Mobile nav toggle placeholder */}
          <div className="md:hidden flex gap-2">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
