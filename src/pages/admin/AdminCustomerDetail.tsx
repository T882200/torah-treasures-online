import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShoppingCart, MessageSquare, Phone, Mail } from "lucide-react";

const AdminCustomerDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: interactions } = useQuery({
    queryKey: ["admin-customer-interactions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_interactions")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crm_interactions").insert({
        customer_id: id!,
        type: "note",
        body: newNote,
        created_by: "admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-interactions", id] });
      setNewNote("");
      toast.success("הערה נוספה");
    },
  });

  const addTag = useMutation({
    mutationFn: async () => {
      const currentTags = customer?.tags || [];
      if (currentTags.includes(newTag)) return;
      const { error } = await supabase
        .from("customers")
        .update({ tags: [...currentTags, newTag] })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      setNewTag("");
      toast.success("תגית נוספה");
    },
  });

  const interactionIcons: Record<string, any> = {
    order: ShoppingCart,
    note: MessageSquare,
    call: Phone,
    email: Mail,
  };

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

  if (!customer) return <AdminLayout title="טוען..."><div /></AdminLayout>;

  return (
    <AdminLayout title={customer.full_name || customer.email}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פרטי לקוח</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">אימייל:</span> {customer.email}</div>
              <div><span className="text-muted-foreground">טלפון:</span> {customer.phone || "—"}</div>
              <div><span className="text-muted-foreground">עיר:</span> {customer.city || "—"}</div>
              <div><span className="text-muted-foreground">כתובת:</span> {customer.address_line1 || "—"}</div>
              <div className="border-t border-border pt-3">
                <span className="text-muted-foreground">הזמנות:</span> <strong>{customer.total_orders}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">סה״כ הוצאות:</span> <strong>₪{Number(customer.total_spent || 0).toFixed(2)}</strong>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">תגיות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {customer.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
                {(!customer.tags || customer.tags.length === 0) && (
                  <span className="text-sm text-muted-foreground">אין תגיות</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="תגית חדשה..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={() => newTag && addTag.mutate()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">היסטוריית הזמנות</CardTitle>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium">#{order.order_number}</span>
                        <span className="text-sm text-muted-foreground mr-3">
                          {order.created_at ? formatDate(order.created_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{order.status}</Badge>
                        <span className="font-bold">₪{Number(order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">אין הזמנות</p>
              )}
            </CardContent>
          </Card>

          {/* CRM Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ציר זמן</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Note */}
              <div className="mb-4">
                <Label>הוסף הערה</Label>
                <div className="flex gap-2 mt-1">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="כתוב הערה..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button variant="gold" size="sm" onClick={() => newNote && addNote.mutate()} disabled={addNote.isPending}>
                    הוסף
                  </Button>
                </div>
              </div>

              {interactions && interactions.length > 0 ? (
                <div className="space-y-3">
                  {interactions.map((interaction) => {
                    const Icon = interactionIcons[interaction.type] || MessageSquare;
                    return (
                      <div key={interaction.id} className="flex gap-3 py-2 border-b border-border last:border-0">
                        <div className="mt-1">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          {interaction.subject && (
                            <p className="font-medium text-sm">{interaction.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{interaction.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {interaction.created_at ? formatDate(interaction.created_at) : ""} • {interaction.created_by || "מערכת"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">אין אינטראקציות</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomerDetail;
