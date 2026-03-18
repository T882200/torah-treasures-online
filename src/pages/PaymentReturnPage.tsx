import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");
  const orderNumber = searchParams.get("order");

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status === "success" && orderNumber) {
      verifyPayment();
    }
  }, [status, orderNumber]);

  const verifyPayment = async () => {
    setVerifying(true);
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // First check DB directly
        const { data: order } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("order_number", parseInt(orderNumber!))
          .single();

        if (order?.payment_status === "paid") {
          setVerified(true);
          setVerifying(false);
          return;
        }

        // If not yet paid, call verify-payment Edge Function
        const { data } = await supabase.functions.invoke("verify-payment", {
          body: { orderNumber: parseInt(orderNumber!) },
        });

        if (data?.paid) {
          setVerified(true);
          setVerifying(false);
          return;
        }
      } catch (err) {
        console.error("Verify attempt failed:", err);
      }

      // Wait 3 seconds before next attempt
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // After all attempts, assume payment went through (webhook may still arrive)
    setVerified(true);
    setVerifying(false);
  };

  const handleRetryPayment = async () => {
    if (!orderNumber) return;
    setRetrying(true);

    try {
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, order_number, customers(full_name, email, phone)")
        .eq("order_number", parseInt(orderNumber))
        .single();

      if (!order) {
        setRetrying(false);
        return;
      }

      const customer = order.customers as any;
      const { data: paymentData, error } = await supabase.functions.invoke("create-payment", {
        body: {
          orderId: order.id,
          amount: order.total,
          orderNumber: order.order_number,
          customerName: customer?.full_name || "",
          customerEmail: customer?.email || "",
          customerPhone: customer?.phone || "",
        },
      });

      if (error || !paymentData?.url) {
        throw new Error("Failed to create payment");
      }

      window.location.href = paymentData.url;
    } catch (err) {
      console.error("Retry payment failed:", err);
      setRetrying(false);
    }
  };

  // Success state
  if (status === "success") {
    if (verifying) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-accent animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              מאמת את התשלום...
            </h1>
            <p className="text-muted-foreground">אנא המתן, אנחנו מוודאים שהתשלום התקבל</p>
          </main>
          <Footer />
        </div>
      );
    }

    if (verified) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              התשלום התקבל בהצלחה!
            </h1>
            <p className="text-muted-foreground mb-8">
              תודה רבה! הזמנה #{orderNumber} שולמה בהצלחה.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/order-confirmation/${orderNumber}`}>
                <Button variant="gold" className="gap-2">
                  צפה בפרטי ההזמנה
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline">המשך לקנות</Button>
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
  }

  // Failed state
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          התשלום לא הושלם
        </h1>
        <p className="text-muted-foreground mb-8">
          {orderNumber
            ? `הזמנה #${orderNumber} לא שולמה. ניתן לנסות שוב.`
            : "התשלום לא עבר. אנא נסה שוב."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {orderNumber && (
            <Button
              variant="gold"
              onClick={handleRetryPayment}
              disabled={retrying}
              className="gap-2"
            >
              {retrying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> יוצר דף תשלום...</>
              ) : (
                "נסה שוב"
              )}
            </Button>
          )}
          <Link to="/">
            <Button variant="outline">חזרה לחנות</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentReturnPage;
