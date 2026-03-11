import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://yehudaica.net";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false }),
      supabase
        .from("categories")
        .select("slug")
        .order("position"),
    ]);

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/cart</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

    if (categories) {
      for (const cat of categories) {
        xml += `
  <url>
    <loc>${BASE_URL}/category/${encodeURIComponent(cat.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    if (products) {
      for (const p of products) {
        const lastmod = p.updated_at ? p.updated_at.split("T")[0] : today;
        xml += `
  <url>
    <loc>${BASE_URL}/product/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    res.status(200).send(xml);
  } catch (err: any) {
    res.setHeader("Content-Type", "application/xml");
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc></url>
</urlset>`);
  }
}
