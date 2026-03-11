import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, FolderOpen, Image as ImageIcon } from "lucide-react";
import ImageLibraryDialog from "@/components/admin/ImageLibraryDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", image_url: "", position: 0 });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.name.toLowerCase().replace(/[^\w\s\u0590-\u05FF-]/g, "").replace(/\s+/g, "-");
      const payload = { name: form.name, slug, image_url: form.image_url || null, position: form.position };

      if (editingId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(editingId ? "הקטגוריה עודכנה" : "הקטגוריה נוצרה");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("הקטגוריה נמחקה");
    },
  });

  const handleImageUpload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `categories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("category-images").upload(path, file);
    if (error) { toast.error("שגיאה בהעלאה"); return; }
    const { data: { publicUrl } } = supabase.storage.from("category-images").getPublicUrl(path);
    setForm(prev => ({ ...prev, image_url: publicUrl }));
  };

  const resetForm = () => {
    setForm({ name: "", slug: "", image_url: "", position: 0 });
    setEditingId(null);
    setDialogOpen(false);
  };

  const startEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug, image_url: cat.image_url || "", position: cat.position || 0 });
    setEditingId(cat.id);
    setDialogOpen(true);
  };

  return (
    <AdminLayout title="ניהול קטגוריות">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{categories?.length || 0} קטגוריות</p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2">
              <Plus className="h-4 w-4" />
              קטגוריה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div>
                <Label>שם *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} dir="ltr" placeholder="auto-generated" />
              </div>
              <div>
                <Label>סדר תצוגה</Label>
                <Input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>תמונה</Label>
                {form.image_url && (
                  <img src={form.image_url} alt="" className="w-20 h-20 rounded object-cover mb-2" />
                )}
                <div className="flex items-center gap-2 mt-1">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm">
                      <Upload className="h-4 w-4" />
                      העלה תמונה
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    />
                  </label>
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLibraryOpen(true)}>
                    <ImageIcon className="h-4 w-4" />
                    מספרייה
                  </Button>
                  <ImageLibraryDialog
                    open={libraryOpen}
                    onOpenChange={setLibraryOpen}
                    onSelect={(urls) => setForm(prev => ({ ...prev, image_url: urls[0] }))}
                    uploadBucket="category-images"
                    uploadPath="categories"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>ביטול</Button>
                <Button type="submit" variant="gold" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "שומר..." : "שמור"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <p className="col-span-full text-center text-muted-foreground py-8">טוען...</p>
        ) : categories?.map((cat) => (
          <div key={cat.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-card group">
            <div className="aspect-video bg-muted overflow-hidden">
              {cat.image_url ? (
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-sm">{cat.name}</h3>
                <p className="text-xs text-muted-foreground" dir="ltr">/{cat.slug}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => { if (confirm("למחוק?")) deleteMutation.mutate(cat.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
