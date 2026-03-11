import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, HelpCircle, Columns } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ───────────────── Types ─────────────────
interface CsvRow {
  [key: string]: string | undefined;
}

type ColumnMapping = "ignore" | "metadata" | string; // string = DB field name

interface ColumnMappingEntry {
  header: string;
  mapping: ColumnMapping;
  samples: string[];
}

const KNOWN_COLUMNS = [
  "name", "price", "stock", "price_raw", "catalog_number",
  "barcode", "description", "is_active", "category", "base64_images",
];

const COLUMN_LABELS: Record<string, string> = {
  name: "שם",
  price: "מחיר",
  stock: "מלאי",
  price_raw: "מחיר מקורי",
  catalog_number: "מק״ט",
  barcode: "ברקוד",
  description: "תיאור",
  is_active: "פעיל",
  category: "קטגוריה",
  base64_images: "תמונות Base64",
};

const MAPPING_STORAGE_KEY = "csv-import-column-mappings";

// ───────────────── Helpers ─────────────────
function parseCsvSmart(text: string): { headers: string[]; rows: CsvRow[] } {
  // Handle quoted fields with commas inside
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });

  return { headers, rows };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    + "-" + Date.now().toString(36);
}

function base64ToBlob(dataUri: string): { blob: Blob; ext: string } {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 image");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const byteStr = atob(match[2]);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  return { blob: new Blob([arr], { type: `image/${match[1]}` }), ext };
}

// ───────────────── Component ─────────────────
const AdminProductImport = () => {
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number; categories_created: number; images_uploaded: number } | null>(null);

  // Column mapping state (Feature 4)
  const [unknownColumns, setUnknownColumns] = useState<ColumnMappingEntry[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mappings, setMappings] = useState<Record<string, ColumnMapping>>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);

  // Load saved mappings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (saved) setMappings(JSON.parse(saved));
    } catch {}
  }, []);

  const saveMappings = (m: Record<string, ColumnMapping>) => {
    setMappings(m);
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(m));
  };

  // Categories for preview
  const { data: existingCategories } = useQuery({
    queryKey: ["import-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const validateRows = useCallback((rows: CsvRow[], headers: string[]) => {
    const errs: Record<number, string> = {};
    // Determine which header maps to "name" and "price" considering mappings
    const nameCol = headers.find(h => h === "name") || Object.entries(mappings).find(([, v]) => v === "name")?.[0];
    const priceCol = headers.find(h => h === "price") || Object.entries(mappings).find(([, v]) => v === "price")?.[0];

    rows.forEach((row, i) => {
      const name = nameCol ? row[nameCol] : undefined;
      const price = priceCol ? row[priceCol] : undefined;
      if (!name) errs[i] = "שם חסר";
      else if (!price || isNaN(parseFloat(price))) errs[i] = "מחיר לא תקין";
    });
    return errs;
  }, [mappings]);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const { headers, rows: parsed } = parseCsvSmart(text);
    setRawHeaders(headers);
    setRows(parsed);
    setResult(null);
    setImportProgress(0);

    // Classify columns
    const known = headers.filter(h => KNOWN_COLUMNS.includes(h));
    const unknown = headers.filter(h => !KNOWN_COLUMNS.includes(h));
    const missing = ["name", "price"].filter(r => !known.includes(r));

    setMissingRequired(missing);

    if (unknown.length > 0) {
      // Build mapping entries with samples
      const entries: ColumnMappingEntry[] = unknown.map(h => ({
        header: h,
        mapping: mappings[h] || "ignore",
        samples: parsed.slice(0, 3).map(r => r[h] || "").filter(Boolean),
      }));
      setUnknownColumns(entries);
      setShowMappingDialog(true);
    } else {
      setErrors(validateRows(parsed, headers));
    }
  }, [mappings, validateRows]);

  const handleMappingConfirm = () => {
    const newMappings = { ...mappings };
    unknownColumns.forEach(col => {
      newMappings[col.header] = col.mapping;
    });
    saveMappings(newMappings);
    setShowMappingDialog(false);

    // Re-check missing required after mapping
    const effectiveHeaders = [...rawHeaders];
    const nameFound = effectiveHeaders.includes("name") || unknownColumns.some(c => c.mapping === "name");
    const priceFound = effectiveHeaders.includes("price") || unknownColumns.some(c => c.mapping === "price");
    const stillMissing: string[] = [];
    if (!nameFound) stillMissing.push("name");
    if (!priceFound) stillMissing.push("price");
    setMissingRequired(stillMissing);

    setErrors(validateRows(rows, rawHeaders));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    }
  };

  // Resolve effective field name for a CSV header
  const resolveField = (header: string): string | null => {
    if (KNOWN_COLUMNS.includes(header)) return header;
    const m = mappings[header];
    if (!m || m === "ignore") return null;
    if (m === "metadata") return `metadata:${header}`;
    return m; // mapped to another known field
  };

  const handleImport = async () => {
    const validRows = rows.filter((_, i) => !errors[i]);
    if (validRows.length === 0) {
      toast.error("אין שורות תקינות לייבוא");
      return;
    }

    setImporting(true);
    let created = 0, updated = 0, errCount = 0, categoriesCreated = 0, imagesUploaded = 0;

    // Category cache: name -> id
    const catCache: Record<string, string> = {};
    (existingCategories || []).forEach(c => { catCache[c.name.toLowerCase()] = c.id; });

    for (let ri = 0; ri < validRows.length; ri++) {
      const row = validRows[ri];
      try {
        // Build product payload from all headers
        const payload: Record<string, any> = {};
        const metadataObj: Record<string, any> = {};
        let categoryName: string | null = null;
        let base64Images: string[] = [];

        for (const header of rawHeaders) {
          const field = resolveField(header);
          if (!field) continue;
          const val = row[header] || "";
          if (!val) continue;

          if (field.startsWith("metadata:")) {
            metadataObj[field.replace("metadata:", "")] = val;
          } else if (field === "category") {
            categoryName = val;
          } else if (field === "base64_images") {
            base64Images = val.split("|").filter(Boolean);
          } else if (field === "price" || field === "price_raw") {
            payload[field] = parseFloat(val) || 0;
          } else if (field === "stock") {
            payload[field] = parseInt(val) || 0;
          } else if (field === "is_active") {
            payload[field] = val.toLowerCase() !== "false" && val !== "0";
          } else {
            payload[field] = val;
          }
        }

        // Required fields
        if (!payload.name) continue;
        payload.slug = payload.slug || generateSlug(payload.name);
        if (!payload.price) payload.price = 0;

        // Add metadata if any
        if (Object.keys(metadataObj).length > 0) {
          payload.metadata = metadataObj;
        }

        // Upsert product
        let productId: string | null = null;
        if (payload.catalog_number) {
          const { data } = await supabase
            .from("products").select("id").eq("catalog_number", payload.catalog_number).maybeSingle();
          if (data) productId = data.id;
        }
        if (!productId && payload.barcode) {
          const { data } = await supabase
            .from("products").select("id").eq("barcode", payload.barcode).maybeSingle();
          if (data) productId = data.id;
        }

        if (productId) {
          const { error } = await supabase.from("products").update(payload).eq("id", productId);
          if (error) throw error;
          updated++;
        } else {
          const { data, error } = await supabase.from("products").insert(payload).select("id").single();
          if (error) throw error;
          productId = data.id;
          created++;
        }

        // Handle category
        if (categoryName && productId) {
          const catKey = categoryName.toLowerCase().trim();
          let catId = catCache[catKey];
          if (!catId) {
            // Create category
            const slug = catKey.replace(/[^\w\s\u0590-\u05FF-]/g, "").replace(/\s+/g, "-");
            const { data: newCat, error: catErr } = await supabase
              .from("categories")
              .insert({ name: categoryName.trim(), slug: slug + "-" + Date.now().toString(36) })
              .select("id")
              .single();
            if (!catErr && newCat) {
              catId = newCat.id;
              catCache[catKey] = catId;
              categoriesCreated++;
            }
          }
          if (catId) {
            // Upsert product_categories
            await supabase
              .from("product_categories")
              .upsert({ product_id: productId, category_id: catId }, { onConflict: "product_id,category_id" });
          }
        }

        // Handle base64 images
        if (base64Images.length > 0 && productId) {
          const { data: existingImgs } = await supabase
            .from("product_images").select("position").eq("product_id", productId)
            .order("position", { ascending: false }).limit(1);
          let pos = (existingImgs?.[0]?.position ?? -1) + 1;

          for (const b64 of base64Images) {
            try {
              const { blob, ext } = base64ToBlob(b64.trim());
              const filePath = `${productId}/${Date.now()}-${pos}.${ext}`;
              const { error: upErr } = await supabase.storage.from("product-images").upload(filePath, blob);
              if (upErr) continue;
              const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
              await supabase.from("product_images").insert({
                product_id: productId, url: publicUrl, position: pos++, is_video: false,
              });
              imagesUploaded++;
            } catch {}
          }
        }
      } catch {
        errCount++;
      }
      setImportProgress(Math.round(((ri + 1) / validRows.length) * 100));
    }

    setResult({ created, updated, errors: errCount, categories_created: categoriesCreated, images_uploaded: imagesUploaded });
    setImporting(false);
    toast.success(`ייבוא הושלם: ${created} נוצרו, ${updated} עודכנו`);
  };

  const downloadTemplate = () => {
    const csv = "name,price,stock,price_raw,catalog_number,barcode,description,is_active,category,base64_images\n" +
      '"ספר לדוגמה",49.90,10,59.90,CAT001,1234567890,"תיאור הספר",true,"הלכה",""';
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
  };

  // Find which column has images
  const imageHeader = rawHeaders.find(h => resolveField(h) === "base64_images");

  return (
    <AdminLayout title="ייבוא מוצרים מ-CSV">
      <div className="max-w-5xl space-y-6">
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            הורד תבנית CSV
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            עמודות נתמכות: {KNOWN_COLUMNS.join(", ")}
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv";
            input.onchange = () => input.files?.[0] && handleFile(input.files[0]);
            input.click();
          }}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גרור קובץ CSV לכאן או לחץ להעלאה</p>
        </div>

        {/* Missing required columns error */}
        {missingRequired.length > 0 && rows.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">עמודות חובה חסרות</p>
              <p className="text-sm text-destructive/80">
                העמודות הבאות נדרשות אך לא נמצאו: {missingRequired.map(c => COLUMN_LABELS[c] || c).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ניתן למפות עמודות לא ידועות דרך חלון המיפוי.</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && missingRequired.length === 0 && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {rows.length} שורות • {Object.keys(errors).length} שגיאות
                </p>
                {Object.keys(mappings).length > 0 && (
                  <button
                    onClick={() => setShowMappingDialog(true)}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <Columns className="h-3 w-3" />
                    מיפוי עמודות
                  </button>
                )}
              </div>
              <Button
                variant="gold"
                onClick={handleImport}
                disabled={importing || Object.keys(errors).length === rows.length}
                className="gap-2"
              >
                {importing ? `מייבא... ${importProgress}%` : "ייבא מוצרים"}
              </Button>
            </div>

            {importing && (
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
              </div>
            )}

            <div className="bg-card rounded-lg border border-border shadow-card overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>שם</TableHead>
                    <TableHead>מחיר</TableHead>
                    <TableHead>מלאי</TableHead>
                    <TableHead>מק״ט</TableHead>
                    <TableHead>קטגוריה</TableHead>
                    {imageHeader && <TableHead>תמונות</TableHead>}
                    <TableHead>סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 30).map((row, i) => {
                    const nameField = rawHeaders.find(h => resolveField(h) === "name") || "name";
                    const priceField = rawHeaders.find(h => resolveField(h) === "price") || "price";
                    const stockField = rawHeaders.find(h => resolveField(h) === "stock") || "stock";
                    const catNumField = rawHeaders.find(h => resolveField(h) === "catalog_number") || "catalog_number";
                    const catField = rawHeaders.find(h => resolveField(h) === "category") || "category";
                    const imgCount = imageHeader && row[imageHeader] ? row[imageHeader]!.split("|").filter(Boolean).length : 0;

                    return (
                      <TableRow key={i} className={errors[i] ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{row[nameField] || "—"}</TableCell>
                        <TableCell dir="ltr">{row[priceField] || "—"}</TableCell>
                        <TableCell>{row[stockField] || "0"}</TableCell>
                        <TableCell>{row[catNumField] || "—"}</TableCell>
                        <TableCell>
                          {row[catField] ? (
                            <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded">{row[catField]}</span>
                          ) : "—"}
                        </TableCell>
                        {imageHeader && (
                          <TableCell>
                            {imgCount > 0 ? (
                              <span className="text-xs text-accent">{imgCount} 📷</span>
                            ) : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          {errors[i] ? (
                            <span className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              {errors[i]}
                            </span>
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {rows.length > 30 && (
              <p className="text-xs text-muted-foreground">מציג 30 שורות ראשונות מתוך {rows.length}</p>
            )}
          </>
        )}

        {/* Result */}
        {result && (
          <div className="bg-card rounded-lg border border-border p-4 shadow-card">
            <h3 className="font-display font-bold mb-3">תוצאות הייבוא</h3>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{result.created}</div>
                <div className="text-xs text-muted-foreground">נוצרו</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{result.updated}</div>
                <div className="text-xs text-muted-foreground">עודכנו</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{result.categories_created}</div>
                <div className="text-xs text-muted-foreground">קטגוריות חדשות</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{result.images_uploaded}</div>
                <div className="text-xs text-muted-foreground">תמונות הועלו</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{result.errors}</div>
                <div className="text-xs text-muted-foreground">שגיאות</div>
              </div>
            </div>
          </div>
        )}

        {/* Column Mapping Dialog (Feature 4) */}
        <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
                מיפוי עמודות לא מוכרות
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              הקובץ מכיל עמודות שלא מוכרות. בחר מה לעשות עם כל עמודה.
            </p>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {unknownColumns.map((col, idx) => (
                <div key={col.header} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{col.header}</span>
                    <Select
                      value={col.mapping}
                      onValueChange={(val) => {
                        const next = [...unknownColumns];
                        next[idx] = { ...next[idx], mapping: val as ColumnMapping };
                        setUnknownColumns(next);
                      }}
                    >
                      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">🚫 התעלם</SelectItem>
                        <SelectItem value="metadata">📦 שמור כ-Metadata</SelectItem>
                        {KNOWN_COLUMNS.filter(k =>
                          !rawHeaders.includes(k) || k === col.header
                        ).map(k => (
                          <SelectItem key={k} value={k}>🔗 מפה ל-{COLUMN_LABELS[k] || k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {col.samples.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">דוגמאות:</span>
                      {col.samples.map((s, si) => (
                        <span key={si} className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowMappingDialog(false)}>ביטול</Button>
              <Button variant="gold" onClick={handleMappingConfirm}>אשר מיפוי</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminProductImport;
