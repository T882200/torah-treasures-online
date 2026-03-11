import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload, Search, Image as ImageIcon, X, Check, Download, Film,
  CheckSquare, Square, Loader2,
} from "lucide-react";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
interface UploadPreview {
  file: File;
  url: string; // local blob URL
  status: "pending" | "uploading" | "done" | "error";
}

interface StoredImage {
  id: string;
  product_id: string | null;
  url: string;
  alt_text: string | null;
  position: number | null;
  is_video: boolean | null;
}

// ────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────
const AdminImages = () => {
  return (
    <AdminLayout title="ניהול תמונות">
      <Tabs defaultValue="upload" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="upload">העלאה</TabsTrigger>
          <TabsTrigger value="library">ספריית תמונות</TabsTrigger>
          <TabsTrigger value="export">ייצוא Base64</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadTab />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
        <TabsContent value="export">
          <Base64ExportTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

// ────────────────────────────────────────────
// Tab 1 — Bulk Upload
// ────────────────────────────────────────────
const UploadTab = () => {
  const queryClient = useQueryClient();
  const [previews, setPreviews] = useState<UploadPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("לא נמצאו קבצי תמונה");
      return;
    }
    const items: UploadPreview[] = arr.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      status: "pending" as const,
    }));
    setPreviews(prev => [...prev, ...items]);
  }, []);

  const removePreview = (idx: number) => {
    setPreviews(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].url);
      next.splice(idx, 1);
      return next;
    });
  };

  const clearAll = () => {
    previews.forEach(p => URL.revokeObjectURL(p.url));
    setPreviews([]);
    setOverallProgress(0);
  };

  const uploadAll = async () => {
    const pending = previews.filter(p => p.status === "pending");
    if (pending.length === 0) return;
    setUploading(true);
    let done = 0;

    const updated = [...previews];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;
      updated[i] = { ...updated[i], status: "uploading" };
      setPreviews([...updated]);

      try {
        const file = updated[i].file;
        const ext = file.name.split(".").pop();
        const filePath = `bulk/${Date.now()}-${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        // Insert unassociated image (no product_id)
        const { error: dbErr } = await supabase.from("product_images").insert({
          product_id: null as any, // will be associated later
          url: publicUrl,
          position: 0,
          alt_text: file.name.replace(/\.[^.]+$/, ""),
          is_video: false,
        });
        // If FK constraint forbids null product_id, we skip the DB row and it only lives in storage
        // The library tab will list from storage bucket directly

        updated[i] = { ...updated[i], status: "done" };
      } catch {
        updated[i] = { ...updated[i], status: "error" };
      }
      done++;
      setOverallProgress(Math.round((done / pending.length) * 100));
      setPreviews([...updated]);
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["image-library"] });
    toast.success(`הועלו ${updated.filter(u => u.status === "done").length} תמונות`);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
          // @ts-ignore — webkitdirectory for folder upload
          input.webkitdirectory = false;
          input.onchange = () => input.files && addFiles(input.files);
          input.click();
        }}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground font-body">גרור תמונות לכאן או לחץ לבחירה</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, AVIF</p>
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{previews.length} תמונות נבחרו</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll}>נקה הכל</Button>
              <Button variant="gold" size="sm" onClick={uploadAll} disabled={uploading}>
                {uploading ? `מעלה... ${overallProgress}%` : "העלה הכל"}
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {previews.map((p, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                  <p className="text-[10px] text-white truncate">{p.file.name}</p>
                </div>
                {p.status === "done" && (
                  <div className="absolute top-1 right-1 bg-green-600 text-white rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                {p.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {p.status === "error" && (
                  <div className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </div>
                )}
                {p.status === "pending" && (
                  <button
                    onClick={() => removePreview(idx)}
                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded-full p-0.5 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ────────────────────────────────────────────
// Tab 2 — Image Library (from product_images table)
// ────────────────────────────────────────────
const LibraryTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignProduct, setAssignProduct] = useState("");

  const { data: images, isLoading } = useQuery({
    queryKey: ["image-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*, products:product_id(id, name)")
        .order("id", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as (StoredImage & { products: { id: string; name: string } | null })[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["all-products-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, catalog_number")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const bulkAssign = useMutation({
    mutationFn: async () => {
      if (!assignProduct || selected.size === 0) return;
      // Get current max position for this product
      const { data: existing } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", assignProduct)
        .order("position", { ascending: false })
        .limit(1);
      let pos = (existing?.[0]?.position ?? -1) + 1;

      for (const imgId of selected) {
        await supabase.from("product_images")
          .update({ product_id: assignProduct, position: pos++ })
          .eq("id", imgId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-library"] });
      setSelected(new Set());
      setAssignProduct("");
      toast.success("התמונות שויכו למוצר");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!images) return;
    const filtered = filteredImages();
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const filteredImages = () => {
    if (!images) return [];
    if (!search) return images;
    const q = search.toLowerCase();
    return images.filter(i =>
      (i.alt_text || "").toLowerCase().includes(q) ||
      (i.url || "").toLowerCase().includes(q) ||
      (i.products?.name || "").toLowerCase().includes(q)
    );
  };

  const filtered = filteredImages();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חפש לפי שם קובץ או מוצר..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 ml-1" /> : <Square className="h-4 w-4 ml-1" />}
          {selected.size > 0 ? `${selected.size} נבחרו` : "בחר הכל"}
        </Button>
      </div>

      {/* Bulk assign bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-sm font-bold">{selected.size} תמונות נבחרו</span>
          <Select value={assignProduct} onValueChange={setAssignProduct}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="בחר מוצר לשיוך..." /></SelectTrigger>
            <SelectContent>
              {products?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} {p.catalog_number ? `(${p.catalog_number})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="gold" size="sm" disabled={!assignProduct} onClick={() => bulkAssign.mutate()}>
            שייך למוצר
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filtered.map(img => {
            const isSelected = selected.has(img.id);
            return (
              <div
                key={img.id}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                  isSelected ? "border-accent ring-2 ring-accent/30" : "border-border"
                }`}
                onClick={() => toggleSelect(img.id)}
              >
                <img src={img.url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-[10px] text-white truncate">{img.alt_text || "—"}</p>
                  {img.products?.name && (
                    <p className="text-[9px] text-accent truncate">🔗 {img.products.name}</p>
                  )}
                </div>
                <div className={`absolute top-1 right-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-accent border-accent text-white" : "border-white/80 bg-black/20"
                }`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">אין תמונות בספרייה. העלה תמונות בלשונית ״העלאה״.</p>
      )}
    </div>
  );
};

// ────────────────────────────────────────────
// Tab 3 — Base64 CSV Export (Feature 2)
// ────────────────────────────────────────────
const Base64ExportTab = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [maxWidth, setMaxWidth] = useState(800);
  const [quality, setQuality] = useState(80);
  const [generating, setGenerating] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => { const n = [...prev]; n.splice(idx, 1); return n; });
  };

  const resizeAndConvert = (file: File, maxW: number, qual: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width;
          let h = img.height;
          if (w > maxW) {
            h = Math.round(h * (maxW / w));
            w = maxW;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", qual / 100));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateCsv = async () => {
    if (files.length === 0) return;
    setGenerating(true);
    try {
      const rows: string[] = ["name,base64_image"];
      let size = 0;
      for (const file of files) {
        const name = file.name.replace(/\.[^.]+$/, "").replace(/,/g, " ");
        const b64 = await resizeAndConvert(file, maxWidth, quality);
        size += b64.length;
        // Escape for CSV — wrap in quotes
        rows.push(`"${name}","${b64}"`);
      }
      setTotalSize(size);

      const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `images-base64-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("קובץ CSV נוצר בהצלחה");
    } catch (err: any) {
      toast.error("שגיאה ביצירת CSV: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const estimatedMb = files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        בחר תמונות, הקטן אותן (אופציונלי), והורד קובץ CSV עם עמודות <code>name</code> ו-<code>base64_image</code>.
        את הקובץ אפשר לשלב עם ייבוא מוצרים.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>רוחב מקסימלי (פיקסלים)</Label>
          <Input type="number" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} />
        </div>
        <div>
          <Label>איכות JPEG (%)</Label>
          <Input type="number" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
          input.onchange = () => addFiles(input.files);
          input.click();
        }}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">בחר תמונות להמרה ל-Base64</p>
      </div>

      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{files.length} קבצים • ~{estimatedMb.toFixed(1)} MB מקור</p>
            {estimatedMb > 50 && (
              <p className="text-xs text-destructive">⚠️ גודל גדול מ-50MB, שקול להקטין איכות/רוחב</p>
            )}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="relative group aspect-square rounded border border-border overflow-hidden">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeFile(i)} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white p-0.5 truncate">{f.name}</p>
              </div>
            ))}
          </div>
          <Button variant="gold" onClick={generateCsv} disabled={generating} className="gap-2">
            <Download className="h-4 w-4" />
            {generating ? "מייצר CSV..." : "הורד CSV עם Base64"}
          </Button>
          {totalSize > 0 && (
            <p className="text-xs text-muted-foreground">גודל CSV שנוצר: ~{(totalSize / 1024 / 1024).toFixed(1)} MB</p>
          )}
        </>
      )}
    </div>
  );
};

export default AdminImages;
