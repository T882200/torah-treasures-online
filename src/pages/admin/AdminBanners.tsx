import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import ImageLibraryDialog from "@/components/admin/ImageLibraryDialog";

const AdminBanners = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    link_url: "",
    bg_color: "#1a2744",
    text_color: "#f5f0e8",
    image_url: "",
  });

  const { data: banners, isLoading } = useQuery({
    queryKey: ["promo-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const createBanner = useMutation({
    mutationFn: async () => {
      const pos = banners?.length || 0;
      const { error } = await supabase.from("promo_banners").insert({
        title: form.title,
        subtitle: form.subtitle,
        link_url: form.link_url || null,
        bg_color: form.bg_color,
        text_color: form.text_color,
        image_url: form.image_url || null,
        position: pos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-banners"] });
      setDialogOpen(false);
      setForm({ title: "", subtitle: "", link_url: "", bg_color: "#1a2744", text_color: "#f5f0e8", image_url: "" });
      toast.success("באנר נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת באנר"),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promo_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promo-banners"] }),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-banners"] });
      toast.success("באנר נמחק");
    },
  });

  const uploadBannerImage = async (file: File) => {
    const path = `banner-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <AdminLayout title="באנרים ומבצעים">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">באנרים שניתן לשלב בדף הבית ובדפי קטגוריה</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-1" />באנר חדש</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg">
              <DialogHeader><DialogTitle>יצירת באנר</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>כותרת</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>תת כותרת</Label>
                  <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </div>
                <div>
                  <Label>קישור (אופציונלי)</Label>
                  <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/category/sale" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>צבע רקע</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>צבע טקסט</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>תמונת רקע (אופציונלי)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm">
                        <Plus className="h-4 w-4" />
                        העלה תמונה
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const url = await uploadBannerImage(file);
                              setForm({ ...form, image_url: url });
                            } catch {
                              toast.error("שגיאה בהעלאה");
                            }
                          }
                        }}
                      />
                    </label>
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLibraryOpen(true)}>
                      <ImageIcon className="h-4 w-4" />
                      מספרייה
                    </Button>
                    <ImageLibraryDialog
                      open={libraryOpen}
                      onOpenChange={setLibraryOpen}
                      onSelect={(urls) => setForm({ ...form, image_url: urls[0] })}
                      uploadBucket="banners"
                    />
                  </div>
                </div>
                {/* Preview */}
                <div
                  className="rounded-lg p-6 text-center relative overflow-hidden"
                  style={{
                    backgroundColor: form.bg_color,
                    color: form.text_color,
                    backgroundImage: form.image_url ? `url(${form.image_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {form.image_url && <div className="absolute inset-0 bg-black/40" />}
                  <div className="relative">
                    <h3 className="font-display text-xl font-bold">{form.title || "כותרת הבאנר"}</h3>
                    <p className="text-sm opacity-80 mt-1">{form.subtitle || "תת כותרת"}</p>
                  </div>
                </div>
                <Button onClick={() => createBanner.mutate()} disabled={!form.title}>צור באנר</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p>טוען...</p>
        ) : (
          <div className="space-y-3">
            {banners?.map((banner: any) => (
              <Card key={banner.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div
                    className="w-48 h-16 rounded flex items-center justify-center text-xs font-bold shrink-0 relative overflow-hidden"
                    style={{
                      backgroundColor: banner.bg_color,
                      color: banner.text_color,
                      backgroundImage: banner.image_url ? `url(${banner.image_url})` : undefined,
                      backgroundSize: "cover",
                    }}
                  >
                    {banner.image_url && <div className="absolute inset-0 bg-black/30" />}
                    <span className="relative truncate px-2">{banner.title}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{banner.title}</p>
                    <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                  </div>
                  <Switch
                    checked={banner.is_active}
                    onCheckedChange={(v) => toggleBanner.mutate({ id: banner.id, is_active: v })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteBanner.mutate(banner.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBanners;
