/**
 * Ateret Judaica Scraper v2
 * ─────────────────────────────────────────────────────
 * Scrapes all products from ateret-judaica.com using
 * the public WooCommerce Store API (JSON, no HTML parsing).
 * Now includes product variations (sizes, colors) with per-variant pricing.
 * Outputs a CSV file ready for import into our admin panel.
 */

import { stringify } from "csv-stringify/sync";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Config ───────────────────────────────────────────
const BASE_URL = "https://www.ateret-judaica.com";
const PRODUCTS_API = `${BASE_URL}/wp-json/wc/store/v1/products`;
const CATEGORIES_API = `${BASE_URL}/wp-json/wc/store/v1/products/categories`;
const PER_PAGE = 100;
const DELAY_MS = 500; // polite delay between requests
const VARIATION_DELAY_MS = 200; // shorter delay for variation detail fetches
const USER_AGENT = "AteretScraper/2.0 (authorized-partner)";

// Output paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_OUTPUT_PROJECT_ROOT = resolve(__dirname, "../../ATR_WEB.CSV");
const CSV_OUTPUT_SCRAPER_DIR = resolve(__dirname, "../ATR_WEB.CSV");

// ─── Types ────────────────────────────────────────────
interface WcCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

interface WcProductImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
}

interface WcProductCategory {
  id: number;
  name: string;
  slug: string;
}

interface WcVariationRef {
  id: number;
  attributes: Array<{ name: string; value: string }>;
}

interface WcProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  type: string;
  permalink: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    price_range?: { min_amount: string; max_amount: string } | null;
  };
  images: WcProductImage[];
  categories: WcProductCategory[];
  is_purchasable: boolean;
  is_in_stock: boolean;
  average_rating: string;
  review_count: number;
  attributes: Array<{
    id: number;
    name: string;
    taxonomy: string;
    has_variations?: boolean;
    terms: Array<{ id: number; name: string; slug: string }>;
  }>;
  variations?: WcVariationRef[];
}

/** Details fetched per-variation from the API */
interface WcVariationDetail {
  id: number;
  name: string;
  parent: number;
  type: string;
  variation: string; // e.g. "מידה: מידה 50"
  prices: { price: string; regular_price: string };
  sku: string;
  stock_status: string;
  is_in_stock?: boolean;
}

interface CsvProduct {
  name: string;
  price: string;
  price_raw: string;
  stock: string;
  catalog_number: string;
  barcode: string;
  description: string;
  is_active: string;
  category: string;
  image_urls: string;
  source_url: string;
  source_id: string;
  attributes: string;
  variants: string;
}

// ─── Helpers ──────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(text: string): string {
  // Named entities
  const named: Record<string, string> = {
    "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
    "&quot;": '"', "&apos;": "'", "&laquo;": "«", "&raquo;": "»",
    "&ndash;": "–", "&mdash;": "—", "&lsquo;": "'", "&rsquo;": "'",
    "&ldquo;": "\u201C", "&rdquo;": "\u201D", "&hellip;": "…",
    "&trade;": "™", "&copy;": "©", "&reg;": "®",
    "&shy;": "", "&zwnj;": "", "&zwj;": "",
  };
  let result = text;
  for (const [entity, char] of Object.entries(named)) {
    result = result.replaceAll(entity, char);
  }
  // Numeric entities: &#8211; &#x20AC; etc.
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
  result = result.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10))
  );
  return result;
}

function priceFromMinorUnits(raw: string): string {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return "0";
  return (num / 100).toFixed(2);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Fetch all categories ─────────────────────────────
async function fetchAllCategories(): Promise<Map<number, string>> {
  console.log("📂 שולף קטגוריות...");
  const map = new Map<number, string>();
  let page = 1;

  while (true) {
    const url = `${CATEGORIES_API}?per_page=${PER_PAGE}&page=${page}`;
    const cats = await fetchJson<WcCategory[]>(url);

    if (cats.length === 0) break;

    for (const cat of cats) {
      map.set(cat.id, cat.name);
    }

    console.log(`   עמוד ${page}: ${cats.length} קטגוריות`);

    if (cats.length < PER_PAGE) break;
    page++;
    await sleep(DELAY_MS);
  }

  console.log(`   ✅ סה"כ ${map.size} קטגוריות\n`);
  return map;
}

// ─── Fetch all products ───────────────────────────────
async function fetchAllProducts(): Promise<WcProduct[]> {
  console.log("📦 שולף מוצרים...");
  const all: WcProduct[] = [];
  let page = 1;

  while (true) {
    const url = `${PRODUCTS_API}?per_page=${PER_PAGE}&page=${page}`;

    try {
      const products = await fetchJson<WcProduct[]>(url);

      if (products.length === 0) break;

      all.push(...products);
      console.log(`   עמוד ${page}: ${products.length} מוצרים (סה"כ עד כה: ${all.length})`);

      if (products.length < PER_PAGE) break;
      page++;
      await sleep(DELAY_MS);
    } catch (err) {
      // Some APIs return 404 on pages beyond the last
      if (String(err).includes("404")) break;
      throw err;
    }
  }

  console.log(`   ✅ סה"כ ${all.length} מוצרים\n`);
  return all;
}

// ─── Fetch variation details ──────────────────────────
async function fetchVariationDetail(variationId: number): Promise<WcVariationDetail | null> {
  try {
    const url = `${PRODUCTS_API}/${variationId}`;
    return await fetchJson<WcVariationDetail>(url);
  } catch {
    return null;
  }
}

/**
 * For a variable product, fetch all variation details and build the variants string.
 * Format: label:value:price_raw:sku|label:value:price_raw:sku|...
 *
 * The label comes from the product's attributes, the value/price/sku from each variation detail.
 */
async function buildVariantsString(product: WcProduct): Promise<{ variantsStr: string; variantCount: number }> {
  const variations = product.variations || [];
  if (variations.length === 0) return { variantsStr: "", variantCount: 0 };

  const parts: string[] = [];
  let fetched = 0;

  for (const varRef of variations) {
    const detail = await fetchVariationDetail(varRef.id);
    fetched++;

    if (!detail) continue;

    // Build attribute pairs from the variation reference
    // varRef.attributes: [{name: "מידה", value: "מידה-50"}]
    const attrParts = varRef.attributes.map((a) => {
      const label = decodeHtmlEntities(a.name || "");
      // Decode URL-encoded Hebrew (e.g. %d7%9e%d7%99%d7%93%d7%94 → מידה)
      // then clean up slug-style dashes
      let rawValue = a.value || "";
      try { rawValue = decodeURIComponent(rawValue); } catch { /* keep as-is */ }
      let value = decodeHtmlEntities(rawValue).replace(/-/g, " ").trim();
      return `${label}=${value}`;
    });

    const priceRaw = priceFromMinorUnits(detail.prices?.regular_price || detail.prices?.price || "0");
    const sku = detail.sku || "";
    const inStock = detail.stock_status === "in_stock" ? "1" : "0";

    // Format: attrs;price;sku;stock  (attrs can be multiple key=value pairs separated by +)
    parts.push(`${attrParts.join("+")};${priceRaw};${sku};${inStock}`);

    // Rate limiting
    if (fetched < variations.length) {
      await sleep(VARIATION_DELAY_MS);
    }
  }

  return { variantsStr: parts.join("|"), variantCount: parts.length };
}

// ─── Transform to CSV rows ────────────────────────────
async function transformProducts(
  products: WcProduct[],
  categoryMap: Map<number, string>
): Promise<{ rows: CsvProduct[]; totalVariations: number }> {
  const rows: CsvProduct[] = [];
  let totalVariations = 0;
  const variableProducts = products.filter((p) => p.type === "variable" && (p.variations?.length || 0) > 0);

  console.log(`🔀 ${variableProducts.length} מוצרים עם וריאציות — שולף פרטי וריאציות...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // Get the best image URL (largest available)
    const imageUrls = p.images.map((img) => img.src || img.thumbnail).filter(Boolean);

    // Get primary category name
    const primaryCategory = p.categories.length > 0
      ? p.categories[0].name
      : "";

    // Build attributes string
    const attrs = p.attributes
      .map((a) => `${a.name}: ${a.terms.map((t) => t.name).join(", ")}`)
      .join(" | ");

    // Description: prefer short_description, fallback to full description
    const desc = stripHtml(p.short_description || p.description || "");

    // Fetch variations for variable products
    let variantsStr = "";
    if (p.type === "variable" && (p.variations?.length || 0) > 0) {
      const result = await buildVariantsString(p);
      variantsStr = result.variantsStr;
      totalVariations += result.variantCount;

      if (result.variantCount > 0) {
        process.stdout.write(`   🔀 ${p.name.slice(0, 40)}... → ${result.variantCount} וריאציות\n`);
      }
    }

    rows.push({
      name: decodeHtmlEntities(p.name),
      price: priceFromMinorUnits(p.prices.price),
      price_raw: priceFromMinorUnits(p.prices.regular_price),
      stock: p.is_in_stock ? "10" : "0", // API doesn't give exact stock, estimate
      catalog_number: p.sku || `ATR-${p.id}`,
      barcode: "",
      description: desc,
      is_active: p.is_in_stock ? "true" : "false",
      category: decodeHtmlEntities(primaryCategory),
      image_urls: imageUrls.join("|"),
      source_url: p.permalink,
      source_id: String(p.id),
      attributes: decodeHtmlEntities(attrs),
      variants: variantsStr,
    });

    // Progress for overall transform
    if ((i + 1) % 100 === 0) {
      console.log(`   ⏳ ${i + 1}/${products.length} מוצרים עובדו`);
    }
  }

  return { rows, totalVariations };
}

// ─── Write CSV ────────────────────────────────────────
function writeCsv(rows: CsvProduct[], outputPath: string): void {
  const csvContent = stringify(rows, {
    header: true,
    columns: [
      { key: "name", header: "name" },
      { key: "price", header: "price" },
      { key: "price_raw", header: "price_raw" },
      { key: "stock", header: "stock" },
      { key: "catalog_number", header: "catalog_number" },
      { key: "barcode", header: "barcode" },
      { key: "description", header: "description" },
      { key: "is_active", header: "is_active" },
      { key: "category", header: "category" },
      { key: "image_urls", header: "image_urls" },
      { key: "source_url", header: "source_url" },
      { key: "source_id", header: "source_id" },
      { key: "attributes", header: "attributes" },
      { key: "variants", header: "variants" },
    ],
    bom: true, // UTF-8 BOM for Excel compatibility
  });

  writeFileSync(outputPath, csvContent, "utf-8");
}

// ─── Main ─────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🕎  Ateret Judaica Scraper v2");
  console.log("  📡  Source: WooCommerce Store API (JSON)");
  console.log("  🔀  Now with product variations!");
  console.log("═══════════════════════════════════════════════\n");

  const startTime = Date.now();

  // Step 1: Fetch categories
  const categoryMap = await fetchAllCategories();

  // Step 2: Fetch all products
  const products = await fetchAllProducts();

  if (products.length === 0) {
    console.error("❌ לא נמצאו מוצרים! בדוק שה-API פעיל.");
    process.exit(1);
  }

  // Step 3: Transform (now async because of variation fetching)
  console.log("🔄 ממיר נתונים לפורמט CSV...\n");
  const { rows: csvRows, totalVariations } = await transformProducts(products, categoryMap);

  // Step 4: Write CSV
  writeCsv(csvRows, CSV_OUTPUT_PROJECT_ROOT);
  console.log(`\n💾 CSV נשמר ב: ${CSV_OUTPUT_PROJECT_ROOT}`);

  writeCsv(csvRows, CSV_OUTPUT_SCRAPER_DIR);
  console.log(`💾 עותק נוסף ב: ${CSV_OUTPUT_SCRAPER_DIR}`);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const withImages = csvRows.filter((r) => r.image_urls).length;
  const withDesc = csvRows.filter((r) => r.description).length;
  const withVariants = csvRows.filter((r) => r.variants).length;
  const categories = new Set(csvRows.map((r) => r.category).filter(Boolean));

  console.log("\n═══════════════════════════════════════════════");
  console.log("  📊  סיכום:");
  console.log(`  • מוצרים: ${csvRows.length}`);
  console.log(`  • קטגוריות: ${categories.size}`);
  console.log(`  • עם תמונות: ${withImages}`);
  console.log(`  • עם תיאור: ${withDesc}`);
  console.log(`  • מוצרים עם וריאציות: ${withVariants}`);
  console.log(`  • סה"כ וריאציות: ${totalVariations}`);
  console.log(`  • זמן ריצה: ${elapsed} שניות`);
  console.log("═══════════════════════════════════════════════");
  console.log("\n✅ הסקרייפר סיים בהצלחה!");
}

main().catch((err) => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
