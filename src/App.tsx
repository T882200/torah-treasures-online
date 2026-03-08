import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductEdit from "./pages/admin/AdminProductEdit";
import AdminProductImport from "./pages/admin/AdminProductImport";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCustomerDetail from "./pages/admin/AdminCustomerDetail";
import AdminChatConversations from "./pages/admin/AdminChatConversations";
import AdminEmailCampaigns from "./pages/admin/AdminEmailCampaigns";
import ChatbotWidget from "./components/storefront/ChatbotWidget";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />

              {/* Authenticated */}
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute requireAdmin><AdminProducts /></ProtectedRoute>} />
              <Route path="/admin/products/new" element={<ProtectedRoute requireAdmin><AdminProductEdit /></ProtectedRoute>} />
              <Route path="/admin/products/:id" element={<ProtectedRoute requireAdmin><AdminProductEdit /></ProtectedRoute>} />
              <Route path="/admin/products/import" element={<ProtectedRoute requireAdmin><AdminProductImport /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/orders/:id" element={<ProtectedRoute requireAdmin><AdminOrderDetail /></ProtectedRoute>} />
              <Route path="/admin/customers" element={<ProtectedRoute requireAdmin><AdminCustomers /></ProtectedRoute>} />
              <Route path="/admin/customers/:id" element={<ProtectedRoute requireAdmin><AdminCustomerDetail /></ProtectedRoute>} />
              <Route path="/admin/chat" element={<ProtectedRoute requireAdmin><AdminChatConversations /></ProtectedRoute>} />
              <Route path="/admin/campaigns" element={<ProtectedRoute requireAdmin><AdminEmailCampaigns /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatbotWidget />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
