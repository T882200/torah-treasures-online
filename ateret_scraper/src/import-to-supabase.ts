/**
 * Direct Supabase Import v2
 * ─────────────────────────────────────────────
 * Reads ATR_WEB_V3.CSV and imports/updates products directly
 * into Supabase, including image URLs and product variants.
 * Runs in Node.js — no browser, no CORS issues.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Supabase config ───
const SUPABASE_URL = "https://pddyniintqbllqujdpao.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZHluaWludHFibGxxdWpkcGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDA0NzIsImV4cCI6MjA4ODU3NjQ3Mn0.H6BJli1rmKW5tBqJZH_JcK54YBmcqKXXwkMtaPPEgyI";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Auth ───
const ADMIN_EMAIL = "t882200@gmail.com";
const ADMIN_PASSWORD = "oK777777";

// ─── CSV path ───
const CSV_PATH = resolve(__dirname, "../ATR_WEB_V3.CSV");

// ─── Helpers ───
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/**
 * Parse the variants column.
 * Format: attrs;price;sku;stock|attrs;price;sku;stock|...
 * Where attrs = label=value or label1=value1+label2=value2
 * Returns array of parsed variants.
 */
function parseVariants(variantsStr: string): Array<{
  label: string;
  value: string;
  price: number;
  sku: string;
  inStock: boolean;
}> {
  if (!variantsStr) return [];

  return variantsStr.split("|").map((part) => {
    const [attrs, priceStr, sku, stockStr] = part.split(";");
    // For now, take the first attribute pair (most products have single attribute)
    const firstAttr = (attrs || "").split("+")[0];
    const [label, value] = firstAttr.split("=");

    return {
      label: (label || "").trim(),
      value: (value || "").trim(),
      price: parseFloat(priceStr) || 0,
      sku: (sku || "").trim(),
      inStock: stockStr === "1",
    };
  }).filter((v) => v.label && v.value);
}

// ─── Main ───
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  📥  Direct Supabase Import v2 (with Variants)");
  console.log("═══════════════════════════════════════════════\n");

  // Sign in as admin
  console.log("🔐 מתחבר כ-admin...");
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (authErr) {
    console.error("❌ שגיאת התחברות:", authErr.message);
    process.exit(1);
  }
  console.log("✅ התחברות הצליחה\n");

  // Read CSV
  const raw = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📖 קרא ${records.length} מוצרים מ-CSV\n`);

  let created = 0, updated = 0, errors = 0, imagesLinked = 0, categoriesCreated = 0;
  let variantsCreated = 0, variantsUpdated = 0;

  // Category cache: name -> id
  const { data: existingCats } = await supabase.from("categories").select("id, name");
  const catCache: Record<string, string> = {};
  (existingCats || []).forEach((c) => { catCache[c.name.toLowerCase().trim()] = c.id; });
  console.log(`📂 ${Object.keys(catCache).length} קטגוריות קיימות\n`);

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const name = row.name?.trim();
      if (!name) continue;

      const price = parseFloat(row.price) || 0;
      const priceRaw = parseFloat(row.price_raw) || 0;
      const stock = parseInt(row.stock) || 0;
      const catalogNumber = row.catalog_number?.trim() || "";
      const description = row.description?.trim() || "";
      const isActive = row.is_active?.toLowerCase() !== "false" && row.is_active !== "0";
      const categoryName = row.category?.trim() || "";
      const imageUrls = (row.image_urls || "").split("|").filter(Boolean);
      const variants = parseVariants(row.variants || "");

      // ─── Find existing product by catalog_number ───
      let productId: string | null = null;

      if (catalogNumber) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("catalog_number", catalogNumber)
          .maybeSingle();
        if (data) productId = data.id;
      }

      // ─── Build payload ───
      // For variable products, use the minimum variant price as the base price
      let displayPrice = price;
      if (variants.length > 0) {
        const variantPrices = variants.map((v) => v.price).filter((p) => p > 0);
        if (variantPrices.length > 0) {
          displayPrice = Math.min(...variantPrices);
        }
      }

      const payload: Record<string, any> = {
        name,
        price: displayPrice,
        price_raw: priceRaw,
        stock,
        catalog_number: catalogNumber || null,
        description: description || null,
        is_active: isActive,
      };

      if (productId) {
        // Update existing
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
        updated++;
      } else {
        // Insert new
        payload.slug = generateSlug(name);
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
        created++;
      }

      // ─── Handle category ───
      if (categoryName && productId) {
        const catKey = categoryName.toLowerCase().trim();
        let catId = catCache[catKey];
        if (!catId) {
          const slug = catKey.replace(/[^\w\s\u0590-\u05FF-]/g, "").replace(/\s+/g, "-")
            + "-" + Date.now().toString(36);
          const { data: newCat, error: catErr } = await supabase
            .from("categories")
            .insert({ name: categoryName, slug })
            .select("id")
            .single();
          if (!catErr && newCat) {
            catId = newCat.id;
            catCache[catKey] = catId;
            categoriesCreated++;
          }
        }
        if (catId) {
          await supabase
            .from("product_categories")
            .upsert({ product_id: productId, category_id: catId }, { onConflict: "product_id,category_id" });
        }
      }

      // ─── Handle images — check if already has images, skip if so ───
      if (imageUrls.length > 0 && productId) {
        const { data: existingImgs } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId);

        if (!existingImgs || existingImgs.length === 0) {
          for (let pos = 0; pos < imageUrls.length; pos++) {
            const url = imageUrls[pos].trim();
            if (!url) continue;
            const { error: imgErr } = await supabase.from("product_images").insert({
              product_id: productId,
              url,
              position: pos,
              is_video: false,
            });
            if (!imgErr) imagesLinked++;
          }
        }
      }

      // ─── Handle variants ───
      if (variants.length > 0 && productId) {
        for (const v of variants) {
          // Check if variant already exists for this product
          const { data: existingVar } = await supabase
            .from("product_variants")
            .select("id")
            .eq("product_id", productId)
            .eq("variant_label", v.label)
            .eq("variant_value", v.value)
            .maybeSingle();

          const varPayload = {
            product_id: productId,
            variant_label: v.label,
            variant_value: v.value,
            price_override: v.price > 0 ? v.price : null,
            stock: v.inStock ? 10 : 0,
            sku: v.sku || null,
            is_active: true,
          };

          if (existingVar) {
            // Update existing variant
            const { error: varErr } = await supabase
              .from("product_variants")
              .update({
                price_override: varPayload.price_override,
                stock: varPayload.stock,
                sku: varPayload.sku,
              })
              .eq("id", existingVar.id);
            if (!varErr) variantsUpdated++;
          } else {
            // Insert new variant
            const { error: varErr } = await supabase
              .from("product_variants")
              .insert(varPayload);
            if (!varErr) variantsCreated++;
          }
        }
      }
    } catch (err: any) {
      errors++;
      if (errors <= 5) {
        console.error(`   ❌ שורה ${i + 1}: ${err.message || err}`);
      }
    }

    // Progress
    if ((i + 1) % 50 === 0 || i === records.length - 1) {
      console.log(`   ⏳ ${i + 1}/${records.length} (${created} חדשים, ${updated} עודכנו, ${imagesLinked} תמונות, ${variantsCreated + variantsUpdated} וריאציות)`);
    }
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  📊  סיכום:");
  console.log(`  • נוצרו: ${created}`);
  console.log(`  • עודכנו: ${updated}`);
  console.log(`  • תמונות קושרו: ${imagesLinked}`);
  console.log(`  • קטגוריות חדשות: ${categoriesCreated}`);
  console.log(`  • וריאציות חדשות: ${variantsCreated}`);
  console.log(`  • וריאציות עודכנו: ${variantsUpdated}`);
  console.log(`  • שגיאות: ${errors}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\n✅ הייבוא הסתיים!");
}

main().catch((err) => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
