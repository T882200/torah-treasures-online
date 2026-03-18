import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber } = await req.json();

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: "חסר orderNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status, payment_ref")
      .eq("order_number", orderNumber)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ paid: false, error: "הזמנה לא נמצאה" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already paid (webhook already processed)
    if (order.payment_status === "paid") {
      return new Response(
        JSON.stringify({ paid: true, orderNumber }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to verify with Cardcom using the stored LowProfileCode
    const lowProfileCode = order.payment_ref;
    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({ paid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");

    const cardcomRes = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TerminalNumber: parseInt(terminalNumber!),
        ApiName: apiName,
        ApiPassword: apiPassword,
        LowProfileCode: lowProfileCode,
      }),
    });

    const result = await cardcomRes.json();
    console.log("Cardcom GetLpResult:", JSON.stringify(result));

    if (String(result.ResponseCode) === "0" && result.TransactionId) {
      // Payment confirmed - update order
      const paymentNote = [
        result.ApprovalNumber && `אישור: ${result.ApprovalNumber}`,
        result.DealNumber && `עסקה: ${result.DealNumber}`,
      ].filter(Boolean).join(" | ");

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "credit_card",
          payment_ref: String(result.TransactionId),
          status: "paid",
          notes: paymentNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ paid: true, orderNumber }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ paid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message, paid: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
