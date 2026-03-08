import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", fullName: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginForm.email, loginForm.password);
      toast.success("התחברת בהצלחה!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(registerForm.email, registerForm.password, registerForm.fullName);
      toast.success("נרשמת בהצלחה! בדוק את האימייל שלך לאישור.");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהרשמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">התחברות</TabsTrigger>
            <TabsTrigger value="register">הרשמה</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <div className="bg-card rounded-lg border border-border p-6 shadow-card">
              <h1 className="font-display text-2xl font-bold mb-6 text-center">התחברות</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">אימייל</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">סיסמה</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading ? "מתחבר..." : "התחבר"}
                </Button>
                <Link to="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-accent">
                  שכחת סיסמה?
                </Link>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="register">
            <div className="bg-card rounded-lg border border-border p-6 shadow-card">
              <h1 className="font-display text-2xl font-bold mb-6 text-center">הרשמה</h1>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">שם מלא</Label>
                  <Input
                    id="reg-name"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm(p => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-email">אימייל *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password">סיסמה *</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(p => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading ? "נרשם..." : "הירשם"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
