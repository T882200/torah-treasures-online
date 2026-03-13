/**
 * Generate ATR_WEB_V3.CSV
 * ─────────────────────────────────────────────
 * Reads ATR_WEB.CSV (with variants column) and recalculates prices:
 *   price = price_raw × 1.20 (20% markup) × 1.18 (18% VAT)
 * Also recalculates variant prices using the same formula.
 * Saves as ATR_WEB_V3.CSV (original file untouched).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = resolve(__dirname, "../../ATR_WEB.CSV");
const OUTPUT_PROJECT = resolve(__dirname, "../../ATR_WEB_V3.CSV");
const OUTPUT_LOCAL = resolve(__dirname, "../ATR_WEB_V3.CSV");

const MARKUP = 1.20;  // 20% profit
const VAT = 1.18;     // 18% VAT
const MULTIPLIER = MARKUP * VAT; // 1.416

function calcConsumerPrice(rawPrice: number): number {
  return Math.round(rawPrice * MULTIPLIER * 100) / 100;
}

/**
 * Recalculate variant prices.
 * Input format:  label=value;price_raw;sku;stock|label=value;price_raw;sku;stock|...
 * Output format: same but with price_raw replaced by consumer price
 */
function recalcVariants(variantsStr: string): string {
  if (!variantsStr) return "";

  return variantsStr
    .split("|")
    .map((part) => {
      const fields = part.split(";");
      // fields: [attrs, price_raw, sku, stock]
      if (fields.length >= 2) {
        const priceRaw = parseFloat(fields[1]) || 0;
        fields[1] = calcConsumerPrice(priceRaw).toFixed(2);
      }
      return fields.join(";");
    })
    .join("|");
}

function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  💰  ATR_WEB V3 — Price Calculator + Variants");
  console.log(`  📐  Formula: price_raw × ${MARKUP} × ${VAT} = price_raw × ${MULTIPLIER.toFixed(3)}`);
  console.log("═══════════════════════════════════════════════\n");

  // Read original CSV
  const raw = readFileSync(INPUT_PATH, "utf-8");
  const clean = raw.replace(/^\uFEFF/, "");

  const records: Record<string, string>[] = parse(clean, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📖 קרא ${records.length} מוצרים מ-ATR_WEB.CSV`);

  // Check for variants column
  const hasVariants = records.length > 0 && "variants" in records[0];
  if (!hasVariants) {
    console.log("⚠️  אין עמודת variants — מחשב רק מחירי מוצרים ראשיים");
  }

  // Recalculate prices
  let pricesChanged = 0;
  let variantsProcessed = 0;
  let totalVariantItems = 0;

  for (const row of records) {
    // Main product price
    const priceRaw = parseFloat(row.price_raw) || 0;
    const newPrice = calcConsumerPrice(priceRaw);
    if (newPrice !== parseFloat(row.price)) {
      pricesChanged++;
    }
    row.price = newPrice.toFixed(2);

    // Variant prices
    if (hasVariants && row.variants) {
      const variantParts = row.variants.split("|").filter(Boolean);
      totalVariantItems += variantParts.length;
      row.variants = recalcVariants(row.variants);
      variantsProcessed++;
    }
  }

  console.log(`🔄 עודכנו מחירים ל-${pricesChanged} מוצרים`);
  if (hasVariants) {
    console.log(`🔀 עודכנו מחירי וריאציות ל-${variantsProcessed} מוצרים (${totalVariantItems} וריאציות)`);
  }

  // Show examples
  console.log("\n📋 דוגמאות:");
  for (const row of records.slice(0, 5)) {
    const variantInfo = row.variants ? ` [${row.variants.split("|").length} וריאציות]` : "";
    console.log(`   ${row.name.substring(0, 45).padEnd(45)} | ₪${row.price_raw} → ₪${row.price}${variantInfo}`);
  }

  // Show variant example
  if (hasVariants) {
    const withVariants = records.find((r) => r.variants);
    if (withVariants) {
      console.log(`\n📋 דוגמת וריאציות למוצר: ${withVariants.name.substring(0, 50)}`);
      const parts = withVariants.variants.split("|").slice(0, 3);
      for (const part of parts) {
        const [attrs, price, sku, stock] = part.split(";");
        console.log(`   ${attrs} → ₪${price} (מק"ט: ${sku || "—"}, מלאי: ${stock === "1" ? "✅" : "❌"})`);
      }
    }
  }

  // Get headers from first record
  const headers = Object.keys(records[0]);

  // Write V3
  const csvContent = stringify(records, {
    header: true,
    columns: headers,
    bom: true,
  });

  writeFileSync(OUTPUT_PROJECT, csvContent, "utf-8");
  console.log(`\n💾 V3 נשמר ב: ${OUTPUT_PROJECT}`);

  writeFileSync(OUTPUT_LOCAL, csvContent, "utf-8");
  console.log(`💾 עותק נוסף ב: ${OUTPUT_LOCAL}`);

  console.log("\n✅ ATR_WEB_V3.CSV מוכן!");
}

main();
