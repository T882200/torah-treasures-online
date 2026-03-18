import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Cardcom webhook - no CORS needed, no auth required
  try {
    let body: Record<string, string> = {};

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        body[key] = value;
      }
    } else if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Try to parse as form data first, then JSON
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }
      }
    }

    console.log("Webhook received:", JSON.stringify(body));

    const orderId = body.ReturnValue || body.returnvalue || body.returnValue;
    const responseCode = body.ResponseCode || body.responsecode || body.responseCode;
    const transactionId = body.TransactionId || body.transactionid || body.transactionId;
    const dealNumber = body.DealNumber || body.dealNumber || body.dealnumber;
    const approvalNumber = body.ApprovalNumber || body.approvalNumber || body.approvalnumber;
    const cardNumber = body.CreditCardNumber || body.creditCardNumber || "";

    if (!orderId) {
      console.error("Webhook missing ReturnValue (orderId)");
      return new Response("OK", { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already processed (idempotency)
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .single();

    if (!order) {
      console.error("Order not found:", orderId);
      return new Response("OK", { status: 200 });
    }

    if (order.payment_status === "paid") {
      console.log("Order already paid, skipping:", orderId);
      return new Response("OK", { status: 200 });
    }

    if (String(responseCode) === "0") {
      // Payment successful
      const paymentNote = [
        approvalNumber && `אישור: ${approvalNumber}`,
        dealNumber && `עסקה: ${dealNumber}`,
        cardNumber && `כרטיס: ${cardNumber}`,
      ].filter(Boolean).join(" | ");

      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "credit_card",
          payment_ref: String(transactionId || dealNumber || ""),
          status: "paid",
          notes: paymentNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateErr) {
        console.error("Failed to update order:", updateErr);
      } else {
        console.log("Order updated to paid:", orderId);
      }
    } else {
      // Payment failed
      console.log("Payment failed for order:", orderId, "ResponseCode:", responseCode);
      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          notes: `תשלום נכשל — קוד: ${responseCode}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateErr) {
        console.error("Failed to update order notes:", updateErr);
      }
    }

    // Cardcom expects HTTP 200
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("payment-webhook error:", error);
    // Still return 200 to prevent Cardcom from retrying endlessly
    return new Response("OK", { status: 200 });
  }
});
