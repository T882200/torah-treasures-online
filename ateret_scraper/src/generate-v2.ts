/**
 * Generate ATR_WEB_V2.CSV
 * ─────────────────────────────────────────────
 * Reads ATR_WEB.CSV and recalculates the price column:
 *   price = price_raw × 1.20 (20% markup) × 1.18 (18% VAT)
 * Saves as ATR_WEB_V2.CSV (original file untouched).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = resolve(__dirname, "../../ATR_WEB.CSV");
const OUTPUT_PROJECT = resolve(__dirname, "../../ATR_WEB_V2.CSV");
const OUTPUT_LOCAL = resolve(__dirname, "../ATR_WEB_V2.CSV");

const MARKUP = 1.20;  // 20% profit
const VAT = 1.18;     // 18% VAT
const MULTIPLIER = MARKUP * VAT; // 1.416

function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  💰  ATR_WEB V2 — Price Calculator");
  console.log(`  📐  Formula: price_raw × ${MARKUP} × ${VAT} = price_raw × ${MULTIPLIER}`);
  console.log("═══════════════════════════════════════════════\n");

  // Read original CSV
  const raw = readFileSync(INPUT_PATH, "utf-8");
  // Remove BOM if present
  const clean = raw.replace(/^\uFEFF/, "");

  const records: Record<string, string>[] = parse(clean, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📖 קרא ${records.length} מוצרים מ-ATR_WEB.CSV`);

  // Recalculate price
  let changed = 0;
  for (const row of records) {
    const priceRaw = parseFloat(row.price_raw) || 0;
    const newPrice = Math.round(priceRaw * MULTIPLIER * 100) / 100; // round to 2 decimals
    if (newPrice !== parseFloat(row.price)) {
      changed++;
    }
    row.price = newPrice.toFixed(2);
  }

  console.log(`🔄 עודכנו מחירים ל-${changed} מוצרים`);

  // Show some examples
  console.log("\n📋 דוגמאות:");
  for (const row of records.slice(0, 5)) {
    console.log(`   ${row.name.substring(0, 50).padEnd(50)} | מקורי: ₪${row.price_raw} → לצרכן: ₪${row.price}`);
  }

  // Get headers from first record
  const headers = Object.keys(records[0]);

  // Write V2
  const csvContent = stringify(records, {
    header: true,
    columns: headers,
    bom: true,
  });

  writeFileSync(OUTPUT_PROJECT, csvContent, "utf-8");
  console.log(`\n💾 V2 נשמר ב: ${OUTPUT_PROJECT}`);

  writeFileSync(OUTPUT_LOCAL, csvContent, "utf-8");
  console.log(`💾 עותק נוסף ב: ${OUTPUT_LOCAL}`);

  // Verify original untouched
  const originalStill = readFileSync(INPUT_PATH, "utf-8");
  const originalRows: Record<string, string>[] = parse(originalStill.replace(/^\uFEFF/, ""), {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`\n✅ ATR_WEB.CSV המקורי לא השתנה (${originalRows.length} מוצרים)`);
  console.log("✅ ATR_WEB_V2.CSV מוכן!");
}

main();
