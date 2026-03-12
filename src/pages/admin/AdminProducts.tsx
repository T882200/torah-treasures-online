import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  Plus, Search, Pencil, Trash2, Upload, Loader2,
  ImageOff, DollarSign, PackageX, FileText, Tag, Hash,
  CheckSquare, Power, PowerOff, X,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ───────────────── Types & Constants ─────────────────
type QuickFilter =
  | "no_image"
  | "no_price"
  | "out_of_stock"
  | "no_description"
  | "no_category"
  | "no_sku";

interface QuickFilterDef {
  key: QuickFilter;
  label: string;
  icon: React.ReactNode;
}

const QUICK_FILTERS: QuickFilterDef[] = [
  { key: "no_image", label: "בלי תמונה", icon: <ImageOff className="h-3 w-3" /> },
  { key: "no_price", label: "בלי מחיר", icon: <DollarSign className="h-3 w-3" /> },
  { key: "out_of_stock", label: "אזל מהמלאי", icon: <PackageX className="h-3 w-3" /> },
  { key: "no_description", label: "בלי תיאור", icon: <FileText className="h-3 w-3" /> },
  { key: "no_category", label: "בלי קטגוריה", icon: <Tag className="h-3 w-3" /> },
  { key: "no_sku", label: "בלי מק״ט", icon: <Hash className="h-3 w-3" /> },
];

// ───────────────── Component ─────────────────
const AdminProducts = () => {
  const [search, setSearch] = useState("");
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilter>>(new Set());
  const queryClient = useQueryClient();

  // ─── Fetch products with images + categories ───
  const { data: rawProducts, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`*, product_images(url, position), product_categories(category_id)`)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,catalog_number.ilike.%${search}%,barcode.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // ─── Fetch all categories ───
  const { data: categories } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // ─── Client-side filtering ───
  const filteredProducts = useMemo(() => {
    if (!rawProducts) return [];

    return rawProducts.filter((p: any) => {
      // Category filter
      if (categoryFilter !== "__all__") {
        const catIds = (p.product_categories || []).map((pc: any) => pc.category_id);
        if (!catIds.includes(categoryFilter)) return false;
      }

      // Quick filters (all active filters must match)
      for (const f of activeFilters) {
        switch (f) {
          case "no_image":
            if ((p.product_images || []).length > 0) return false;
            break;
          case "no_price":
            if (p.price && p.price > 0) return false;
            break;
          case "out_of_stock":
            if ((p.stock || 0) > 0 && p.is_active !== false) return false;
            break;
          case "no_description":
            if (p.description && p.description.trim()) return false;
            break;
          case "no_category":
            if ((p.product_categories || []).length > 0) return false;
            break;
          case "no_sku":
            if (p.catalog_number && p.catalog_number.trim()) return false;
            break;
        }
      }

      return true;
    });
  }, [rawProducts, categoryFilter, activeFilters]);

  // ─── Selection helpers ───
  const allVisibleIds = useMemo(
    () => new Set(filteredProducts.map((p: any) => p.id)),
    [filteredProducts]
  );

  const allSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Mutations ───
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("המוצר נמחק");
    },
  });

  // ─── Bulk actions ───
  const bulkToggleActive = async (active: boolean) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const label = active ? "הפעלת" : "כיבוי";
    try {
      for (const id of ids) {
        const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(`${label} ${ids.length} מוצרים`);
      setSelectedIds(new Set());
    } catch {
      toast.error(`שגיאה ב${label}`);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!confirm(`למחוק ${ids.length} מוצרים? פעולה זו בלתי הפיכה.`)) return;
    try {
      for (const id of ids) {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(`${ids.length} מוצרים נמחקו`);
      setSelectedIds(new Set());
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  // ─── Quick filter toggle ───
  const toggleQuickFilter = (key: QuickFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelectedIds(new Set()); // clear selection when filters change
  };

  // ─── Image drag-drop handler ───
  const handleRowDrop = useCallback(
    async (productId: string, files: FileList) => {
      setDraggingOver(null);
      if (!files.length) return;

      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) {
        toast.error("רק קבצי תמונה מותרים");
        return;
      }

      setUploading(productId);
      try {
        const { data: existing } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId);
        const currentCount = existing?.length || 0;

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = file.name.split(".").pop();
          const filePath = `${productId}/${Date.now()}-${i}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(filePath);

          const { error: dbError } = await supabase.from("product_images").insert({
            product_id: productId,
            url: publicUrl,
            position: currentCount + i,
          });
          if (dbError) throw dbError;
        }

        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        toast.success(
          `${imageFiles.length} תמונות הועלו ל${rawProducts?.find((p: any) => p.id === productId)?.name || "מוצר"}`
        );
      } catch (err: any) {
        toast.error(`שגיאה: ${err.message}`);
      } finally {
        setUploading(null);
      }
    },
    [rawProducts, queryClient]
  );

  // ─── Count active filters for display ───
  const totalProducts = rawProducts?.length || 0;
  const shownProducts = filteredProducts.length;
  const isFiltered = categoryFilter !== "__all__" || activeFilters.size > 0;

  return (
    <AdminLayout title="מוצרים">
      {/* ─── Top bar: search + category + new product ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מק״ט, ברקוד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">כל הקטגוריות</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Link to="/admin/products/new">
          <Button variant="gold" className="gap-2">
            <Plus className="h-4 w-4" />
            מוצר חדש
          </Button>
        </Link>
      </div>

      {/* ─── Quick filters (chips) ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground ml-1">סינון:</span>
        {QUICK_FILTERS.map((f) => {
          const isActive = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleQuickFilter(f.key)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                border transition-colors cursor-pointer
                ${isActive
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }
              `}
            >
              {f.icon}
              {f.label}
            </button>
          );
        })}
        {isFiltered && (
          <button
            onClick={() => { setActiveFilters(new Set()); setCategoryFilter("__all__"); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:underline"
          >
            <X className="h-3 w-3" />
            נקה הכל
          </button>
        )}
      </div>

      {/* ─── Count bar ─── */}
      <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
        <span>
          {isFiltered
            ? `מציג ${shownProducts} מתוך ${totalProducts} מוצרים`
            : `${totalProducts} מוצרים`
          }
        </span>
      </div>

      {/* ─── Bulk action bar ─── */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <CheckSquare className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">{selectedIds.size} נבחרו</span>
          <div className="flex items-center gap-2 mr-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-green-700" onClick={() => bulkToggleActive(true)}>
              <Power className="h-3 w-3" />
              הפעל
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-orange-600" onClick={() => bulkToggleActive(false)}>
              <PowerOff className="h-3 w-3" />
              כבה
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={bulkDelete}>
              <Trash2 className="h-3 w-3" />
              מחק
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-muted-foreground">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ─── Products table ─── */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="בחר הכל"
                />
              </TableHead>
              <TableHead className="w-16">תמונה</TableHead>
              <TableHead>שם</TableHead>
              <TableHead>מק״ט</TableHead>
              <TableHead>מחיר</TableHead>
              <TableHead>מלאי</TableHead>
              <TableHead>פעיל</TableHead>
              <TableHead className="w-24">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  טוען...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product: any) => {
                const primaryImage = product.product_images
                  ?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];
                const isDragging = draggingOver === product.id;
                const isUploading = uploading === product.id;
                const isSelected = selectedIds.has(product.id);

                return (
                  <TableRow
                    key={product.id}
                    className={`relative transition-colors ${isDragging ? "bg-accent/10 ring-2 ring-accent ring-inset" : ""} ${isSelected ? "bg-accent/5" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingOver(product.id);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDraggingOver(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRowDrop(product.id, e.dataTransfer.files);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(product.id)}
                        aria-label={`בחר ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded overflow-hidden relative">
                        {isUploading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-accent" />
                          </div>
                        ) : primaryImage?.url ? (
                          <img src={primaryImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                        {isDragging && (
                          <div className="absolute inset-0 bg-accent/20 flex items-center justify-center rounded">
                            <Upload className="h-4 w-4 text-accent" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                      {isDragging && (
                        <span className="text-xs text-accent mr-2">שחרר להעלאת תמונות</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.catalog_number || "—"}
                    </TableCell>
                    <TableCell>₪{Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${(product.stock || 0) < 5 ? "text-destructive" : "text-foreground"}`}
                      >
                        {product.stock ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_active ?? false}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: product.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to={`/admin/products/${product.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("למחוק את המוצר?")) {
                              deleteProduct.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {isFiltered ? (
                    <>
                      אין מוצרים התואמים לסינון.{" "}
                      <button
                        onClick={() => { setActiveFilters(new Set()); setCategoryFilter("__all__"); }}
                        className="text-accent hover:underline"
                      >
                        נקה סינון
                      </button>
                    </>
                  ) : (
                    <>
                      אין מוצרים.{" "}
                      <Link to="/admin/products/new" className="text-accent hover:underline">
                        הוסף מוצר ראשון
                      </Link>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
