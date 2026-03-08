import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Calendar } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percentage",
    value: "",
    min_order: "",
    max_uses: "",
    expires_at: "",
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").insert({
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("הקופון נוצר");
      setDialogOpen(false);
      setForm({ code: "", type: "percentage", value: "", min_order: "", max_uses: "", expires_at: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("הקופון נמחק");
    },
  });

  const formatDate = (d: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

  return (
    <AdminLayout title="קופונים והנחות">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{coupons?.length || 0} קופונים</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2"><Plus className="h-4 w-4" />קופון חדש</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>קופון חדש</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <Label>קוד קופון *</Label>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} dir="ltr" required placeholder="SAVE20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג הנחה</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">אחוזים (%)</SelectItem>
                      <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ערך *</Label>
                  <Input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} required dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>הזמנה מינימלית (₪)</Label>
                  <Input type="number" value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))} dir="ltr" />
                </div>
                <div>
                  <Label>מקסימום שימושים</Label>
                  <Input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} dir="ltr" />
                </div>
              </div>
              <div>
                <Label>תוקף עד</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} dir="ltr" />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "יוצר..." : "צור קופון"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>קוד</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>ערך</TableHead>
              <TableHead>מינימום</TableHead>
              <TableHead>שימושים</TableHead>
              <TableHead>תוקף</TableHead>
              <TableHead>פעיל</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : coupons?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold">{c.code}</TableCell>
                <TableCell>{c.type === "percentage" ? "אחוזים" : "סכום קבוע"}</TableCell>
                <TableCell>{c.type === "percentage" ? `${c.value}%` : `₪${Number(c.value).toFixed(2)}`}</TableCell>
                <TableCell>₪{Number(c.min_order || 0).toFixed(0)}</TableCell>
                <TableCell>{c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-sm">{c.expires_at ? formatDate(c.expires_at) : "—"}</TableCell>
                <TableCell>
                  <Switch checked={c.is_active ?? false} onCheckedChange={checked => toggleActive.mutate({ id: c.id, is_active: checked })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => { if (confirm("למחוק?")) deleteMutation.mutate(c.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminCoupons;
