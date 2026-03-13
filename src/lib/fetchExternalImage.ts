import { supabase } from "@/integrations/supabase/client";

/**
 * Extract an image URL from a drag event's DataTransfer.
 * Checks text/uri-list, text/html (<img> tag), and text/plain.
 */
export function extractImageUrl(dataTransfer: DataTransfer): string | null {
  // 1. text/uri-list — most reliable for cross-browser image drags
  const uriList = dataTransfer.getData("text/uri-list");
  if (uriList) {
    const firstUrl = uriList
      .split("\n")
      .find((line) => !line.startsWith("#") && line.trim());
    if (firstUrl && firstUrl.trim().startsWith("http")) {
      return firstUrl.trim();
    }
  }

  // 2. text/html — look for <img src="...">
  const html = dataTransfer.getData("text/html");
  if (html) {
    const url = extractImageUrlFromHtml(html);
    if (url) return url;
  }

  // 3. text/plain — bare URL
  const text = dataTransfer.getData("text/plain");
  if (text && text.trim().startsWith("http")) {
    return text.trim();
  }

  return null;
}

/**
 * Extract an image URL from an HTML string (e.g. clipboard HTML).
 * Looks for <img src="...">.
 */
export function extractImageUrlFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1] && match[1].startsWith("http")) {
    return match[1];
  }
  return null;
}

/**
 * Fetch an image from a URL and return it as a File object.
 * Tries client-side fetch first (works if CORS allows),
 * then falls back to Edge Function proxy.
 */
export async function fetchImageFromUrl(url: string): Promise<File> {
  // Attempt 1: Direct client-side fetch
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) {
        const blob = await res.blob();
        const ext = extensionFromMime(contentType);
        return new File([blob], `external-${Date.now()}.${ext}`, {
          type: contentType,
        });
      }
    }
  } catch {
    // CORS or network error — fall through to proxy
  }

  // Attempt 2: Proxy through Edge Function
  const { data, error } = await supabase.functions.invoke("fetch-image", {
    body: { url },
  });

  if (error) {
    throw new Error(`שגיאה בהורדת תמונה: ${error.message}`);
  }

  // supabase.functions.invoke returns Blob when Content-Type is not JSON
  if (data instanceof Blob && data.type.startsWith("image/")) {
    const ext = extensionFromMime(data.type);
    return new File([data], `external-${Date.now()}.${ext}`, {
      type: data.type,
    });
  }

  // If the response is JSON, it's an error from the Edge Function
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(data.error as string);
  }

  throw new Error("תגובה לא צפויה מהשרת");
}

function extensionFromMime(mime: string): string {
  const sub = mime.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (!sub) return "jpg";
  if (sub === "jpeg") return "jpg";
  if (sub === "svg+xml") return "svg";
  return sub;
}
