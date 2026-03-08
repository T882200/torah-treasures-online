import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Image as ImageIcon } from "lucide-react";

const CORNERS = [
  { value: "top-right", label: "ימין עליון" },
  { value: "top-left", label: "שמאל עליון" },
  { value: "bottom-right", label: "ימין תחתון" },
  { value: "bottom-left", label: "שמאל תחתון" },
];

const AdminBadges = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "text" as "text" | "image",
    label: "",
    bg_color: "#d4a017",
    text_color: "#ffffff",
    corner: "top-right",
    image_url: "",
  });

  const { data: badges, isLoading } = useQuery({
    queryKey: ["product-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_badges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBadge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_badges").insert({
        name: form.name,
        type: form.type,
        label: form.type === "text" ? form.label : null,
        bg_color: form.bg_color,
        text_color: form.text_color,
        corner: form.corner,
        image_url: form.type === "image" ? form.image_url : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-badges"] });
      setDialogOpen(false);
      setForm({ name: "", type: "text", label: "", bg_color: "#d4a017", text_color: "#ffffff", corner: "top-right", image_url: "" });
      toast.success("תגית נוצרה בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת תגית"),
  });

  const toggleBadge = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("product_badges").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-badges"] }),
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_badges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-badges"] });
      toast.success("תגית נמחקה");
    },
  });

  const uploadBadgeImage = async (file: File) => {
    const path = `badge-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("badges").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("badges").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <AdminLayout title="תגיות מבצע">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">ניהול תגיות (badges) שמוצגות על כרטיסי מוצר</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />
                תגית חדשה
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>יצירת תגית מבצע</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>שם (פנימי)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="מבצע חודשי" />
                </div>
                <div>
                  <Label>סוג</Label>
                  <Select value={form.type} onValueChange={(v: "text" | "image") => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">טקסט + צבע</SelectItem>
                      <SelectItem value="image">תמונה מותאמת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "text" ? (
                  <>
                    <div>
                      <Label>טקסט התגית</Label>
                      <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="מבצע!" />
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
                  </>
                ) : (
                  <div>
                    <Label>תמונת תגית (PNG שקוף)</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadBadgeImage(file);
                            setForm({ ...form, image_url: url });
                            toast.success("תמונה הועלתה");
                          } catch {
                            toast.error("שגיאה בהעלאה");
                          }
                        }
                      }}
                    />
                    {form.image_url && <img src={form.image_url} alt="" className="h-16 mt-2" />}
                  </div>
                )}
                <div>
                  <Label>מיקום</Label>
                  <Select value={form.corner} onValueChange={(v) => setForm({ ...form, corner: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CORNERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Preview */}
                <div className="border rounded-lg p-4 relative bg-muted h-32 flex items-center justify-center text-muted-foreground text-sm">
                  תצוגה מקדימה
                  <div
                    className={`absolute ${form.corner.includes("top") ? "top-2" : "bottom-2"} ${form.corner.includes("right") ? "right-2" : "left-2"}`}
                  >
                    {form.type === "text" ? (
                      <span
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{ backgroundColor: form.bg_color, color: form.text_color }}
                      >
                        {form.label || "מבצע"}
                      </span>
                    ) : form.image_url ? (
                      <img src={form.image_url} alt="" className="h-10" />
                    ) : null}
                  </div>
                </div>
                <Button onClick={() => createBadge.mutate()} disabled={!form.name}>
                  צור תגית
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p>טוען...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges?.map((badge: any) => (
              <Card key={badge.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm">{badge.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {badge.type === "text" ? "טקסט" : "תמונה"} • {CORNERS.find((c) => c.value === badge.corner)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={badge.is_active}
                        onCheckedChange={(v) => toggleBadge.mutate({ id: badge.id, is_active: v })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => deleteBadge.mutate(badge.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge.type === "text" ? (
                      <span
                        className="px-3 py-1 rounded text-xs font-bold"
                        style={{ backgroundColor: badge.bg_color, color: badge.text_color }}
                      >
                        {badge.label}
                      </span>
                    ) : badge.image_url ? (
                      <img src={badge.image_url} alt={badge.name} className="h-10" />
                    ) : (
                      <span className="text-xs text-muted-foreground">ללא תמונה</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBadges;
