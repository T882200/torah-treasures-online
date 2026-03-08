import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId } = await req.json();

    const systemPrompt = `אתה עוזר שירות לקוחות של חנות ספרי קודש מקוונת. 
אתה עונה בעברית, בנימוס ובידידותיות.
אתה יכול לעזור עם:
- מידע על מוצרים וספרים
- מעקב הזמנות
- מדיניות משלוחים והחזרות
- שאלות כלליות על החנות
אם אתה לא יודע תשובה, הצע ללקוח לפנות לשירות לקוחות.
תשובות קצרות וממוקדות.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI Gateway error: ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "מצטער, לא הצלחתי לעבד את הבקשה.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
