import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    // Validate URL is provided
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL format
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "Only HTTP/HTTPS URLs allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the remote image
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Remote server returned ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate content type is an image
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "URL does not point to an image" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check size limit
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image exceeds 10MB size limit" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read the image bytes
    const imageBytes = await response.arrayBuffer();

    // Double-check actual size
    if (imageBytes.byteLength > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image exceeds 10MB size limit" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Return the image binary with proper headers
    return new Response(imageBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "X-Original-Url": url,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
