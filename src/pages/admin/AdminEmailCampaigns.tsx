import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Mail, Eye, MousePointer, Send } from "lucide-react";
import { format } from "date-fns";

const AdminEmailCampaigns = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", html_body: "" });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("status", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriberCount = 0 } = useQuery({
    queryKey: ["subscriber-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("is_subscribed", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_campaigns").insert({
        name: form.name,
        subject: form.subject,
        html_body: form.html_body,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("קמפיין נוצר בהצלחה");
      qc.invalidateQueries({ queryKey: ["admin-email-campaigns"] });
      setDialogOpen(false);
      setForm({ name: "", subject: "", html_body: "" });
    },
    onError: () => toast.error("שגיאה ביצירת קמפיין"),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "draft": return "secondary";
      case "sent": return "default";
      case "scheduled": return "outline";
      default: return "secondary";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "draft": return "טיוטה";
      case "sent": return "נשלח";
      case "scheduled": return "מתוזמן";
      default: return s;
    }
  };

  return (
    <AdminLayout title="קמפיינים">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">קמפיינים</p>
            <p className="font-display text-2xl font-bold">{campaigns.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">מנויים פעילים</p>
            <p className="font-display text-2xl font-bold">{subscriberCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">נשלחו</p>
            <p className="font-display text-2xl font-bold">
              {campaigns.filter((c: any) => c.status === "sent").length}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-lg">כל הקמפיינים</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-2" /> קמפיין חדש</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>קמפיין חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>שם הקמפיין</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>נושא האימייל</Label>
                  <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div>
                  <Label>תוכן (HTML)</Label>
                  <Textarea value={form.html_body} onChange={e => setForm(p => ({ ...p, html_body: e.target.value }))} rows={6} dir="ltr" />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.subject || !form.html_body}>
                  צור קמפיין
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>נושא</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>נשלח</TableHead>
                <TableHead>נפתח</TableHead>
                <TableHead>קליקים</TableHead>
                <TableHead>תאריך</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.subject}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Send className="h-3 w-3" /> {c.total_sent ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Eye className="h-3 w-3" /> {c.total_opened ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MousePointer className="h-3 w-3" /> {c.total_clicked ?? 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.sent_at ? format(new Date(c.sent_at), "dd/MM/yy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    אין קמפיינים עדיין
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmailCampaigns;
