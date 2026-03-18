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
    const { orderId, amount, orderNumber, customerName, customerEmail, customerPhone } = await req.json();

    if (!orderId || !amount || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "חסרים שדות חובה: orderId, amount, orderNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify order exists and is unpaid
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status, total")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "הזמנה לא נמצאה" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.payment_status === "paid") {
      return new Response(
        JSON.stringify({ error: "ההזמנה כבר שולמה" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    const siteUrl = Deno.env.get("SITE_URL") || "https://yehudaica.net";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error("Cardcom credentials not configured");
    }

    const cardcomPayload = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      ApiPassword: apiPassword,
      Amount: amount,
      MaxPayments: 3,
      ReturnValue: orderId,
      SuccessRedirectUrl: `${siteUrl}/payment-return?status=success&order=${orderNumber}`,
      FailedRedirectUrl: `${siteUrl}/payment-return?status=failed&order=${orderNumber}`,
      WebHookUrl: `${supabaseUrl}/functions/v1/payment-webhook`,
      Document: {
        Name: customerName || "",
        Email: customerEmail || "",
        Phone: customerPhone || "",
      },
      ProductName: `הזמנה #${orderNumber}`,
      Language: "he",
      Currency: 1, // ILS
      Operation: 1, // Charge
      CodePage: 65001, // UTF-8
    };

    console.log("Calling Cardcom LowProfile/Create for order:", orderId);

    const cardcomRes = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });

    const cardcomData = await cardcomRes.json();
    console.log("Cardcom response:", JSON.stringify(cardcomData));

    if (!cardcomRes.ok || cardcomData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          error: "שגיאה ביצירת דף תשלום",
          details: cardcomData.Description || cardcomData.ResponseMassage || "Unknown error",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store LowProfileCode in payment_ref for verification later
    await supabaseAdmin
      .from("orders")
      .update({ payment_ref: cardcomData.LowProfileCode })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        url: cardcomData.LowProfileUrl,
        lowProfileCode: cardcomData.LowProfileCode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
