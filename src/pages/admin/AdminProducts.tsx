import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminProducts = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`*, product_images(url, position)`)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,catalog_number.ilike.%${search}%,barcode.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <AdminLayout title="מוצרים">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מק״ט, ברקוד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Link to="/admin/products/new">
          <Button variant="gold" className="gap-2">
            <Plus className="h-4 w-4" />
            מוצר חדש
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : products && products.length > 0 ? (
              products.map((product) => {
                const primaryImage = product.product_images
                  ?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                        {primaryImage?.url ? (
                          <img src={primaryImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.catalog_number || "—"}</TableCell>
                    <TableCell>₪{Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${(product.stock || 0) < 5 ? "text-destructive" : "text-foreground"}`}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_active ?? false}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: product.id, is_active: checked })}
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  אין מוצרים. <Link to="/admin/products/new" className="text-accent hover:underline">הוסף מוצר ראשון</Link>
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
