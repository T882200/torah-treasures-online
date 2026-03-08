import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CsvRow {
  name: string;
  price: string;
  stock?: string;
  price_raw?: string;
  catalog_number?: string;
  barcode?: string;
  description?: string;
  is_active?: string;
  [key: string]: string | undefined;
}

const AdminProductImport = () => {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  const parseCsv = useCallback((text: string): CsvRow[] => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: any = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });
  }, []);

  const validateRows = useCallback((rows: CsvRow[]) => {
    const errs: Record<number, string> = {};
    rows.forEach((row, i) => {
      if (!row.name) errs[i] = "שם חסר";
      else if (!row.price || isNaN(parseFloat(row.price))) errs[i] = "מחיר לא תקין";
    });
    return errs;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setErrors(validateRows(parsed));
    setResult(null);
  }, [parseCsv, validateRows]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s\u0590-\u05FF-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      + "-" + Date.now().toString(36);
  };

  const handleImport = async () => {
    const validRows = rows.filter((_, i) => !errors[i]);
    if (validRows.length === 0) {
      toast.error("אין שורות תקינות לייבוא");
      return;
    }

    setImporting(true);
    let created = 0;
    let updated = 0;
    let errCount = 0;

    for (const row of validRows) {
      try {
        const payload = {
          name: row.name,
          slug: generateSlug(row.name),
          price: parseFloat(row.price),
          price_raw: row.price_raw ? parseFloat(row.price_raw) : null,
          stock: row.stock ? parseInt(row.stock) : 0,
          catalog_number: row.catalog_number || null,
          barcode: row.barcode || null,
          description: row.description || null,
          is_active: row.is_active !== "false",
        };

        // Try to find existing by catalog_number or barcode
        let existingId: string | null = null;
        if (payload.catalog_number) {
          const { data } = await supabase
            .from("products")
            .select("id")
            .eq("catalog_number", payload.catalog_number)
            .maybeSingle();
          if (data) existingId = data.id;
        }
        if (!existingId && payload.barcode) {
          const { data } = await supabase
            .from("products")
            .select("id")
            .eq("barcode", payload.barcode)
            .maybeSingle();
          if (data) existingId = data.id;
        }

        if (existingId) {
          const { error } = await supabase.from("products").update(payload).eq("id", existingId);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("products").insert(payload);
          if (error) throw error;
          created++;
        }
      } catch {
        errCount++;
      }
    }

    setResult({ created, updated, errors: errCount });
    setImporting(false);
    toast.success(`ייבוא הושלם: ${created} נוצרו, ${updated} עודכנו, ${errCount} שגיאות`);
  };

  const downloadTemplate = () => {
    const csv = "name,price,stock,price_raw,catalog_number,barcode,description,is_active\nספר לדוגמה,49.90,10,59.90,CAT001,1234567890,תיאור הספר,true";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
  };

  return (
    <AdminLayout title="ייבוא מוצרים מ-CSV">
      <div className="max-w-4xl space-y-6">
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            הורד תבנית CSV
          </Button>
        </div>

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
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

        {/* Preview */}
        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rows.length} שורות • {Object.keys(errors).length} שגיאות
              </p>
              <Button
                variant="gold"
                onClick={handleImport}
                disabled={importing || Object.keys(errors).length === rows.length}
                className="gap-2"
              >
                {importing ? "מייבא..." : "ייבא מוצרים"}
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-card overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>שם</TableHead>
                    <TableHead>מחיר</TableHead>
                    <TableHead>מלאי</TableHead>
                    <TableHead>מק״ט</TableHead>
                    <TableHead>סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((row, i) => (
                    <TableRow key={i} className={errors[i] ? "bg-destructive/5" : ""}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{row.name || "—"}</TableCell>
                      <TableCell dir="ltr">{row.price || "—"}</TableCell>
                      <TableCell>{row.stock || "0"}</TableCell>
                      <TableCell>{row.catalog_number || "—"}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {rows.length > 20 && (
              <p className="text-xs text-muted-foreground">מציג 20 שורות ראשונות מתוך {rows.length}</p>
            )}
          </>
        )}

        {/* Result */}
        {result && (
          <div className="bg-card rounded-lg border border-border p-4 shadow-card">
            <h3 className="font-display font-bold mb-2">תוצאות הייבוא</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{result.created}</div>
                <div className="text-xs text-muted-foreground">נוצרו</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{result.updated}</div>
                <div className="text-xs text-muted-foreground">עודכנו</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{result.errors}</div>
                <div className="text-xs text-muted-foreground">שגיאות</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProductImport;
