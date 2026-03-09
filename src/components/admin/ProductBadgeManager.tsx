import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { productId: string; }

const ProductBadgeManager = ({ productId }: Props) => {
  const queryClient = useQueryClient();
  const [selectedBadgeId, setSelectedBadgeId] = useState("");

  const { data: allBadges } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_badges").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: assigned } = useQuery({
    queryKey: ["product-badges", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_badge_assignments")
        .select("badge_id, product_badges(id, name, label, bg_color, text_color)")
        .eq("product_id", productId);
      if (error) throw error;
      return data;
    },
  });

  const assignedIds = new Set(assigned?.map(a => a.badge_id) || []);
  const availableBadges = allBadges?.filter(b => !assignedIds.has(b.id)) || [];

  const addMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.from("product_badge_assignments").insert({ product_id: productId, badge_id: badgeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-badges", productId] });
      setSelectedBadgeId("");
      toast.success("תגית שויכה למוצר");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.from("product_badge_assignments").delete().eq("product_id", productId).eq("badge_id", badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-badges", productId] });
      toast.success("תגית הוסרה");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
      <h2 className="font-display font-bold text-lg">תגיות מבצע</h2>

      {assigned && assigned.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assigned.map((a: any) => (
            <Badge
              key={a.badge_id}
              style={{ backgroundColor: a.product_badges?.bg_color, color: a.product_badges?.text_color }}
              className="gap-1 text-sm py-1 px-3"
            >
              {a.product_badges?.label || a.product_badges?.name}
              <button onClick={() => removeMutation.mutate(a.badge_id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {availableBadges.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="בחר תגית..." /></SelectTrigger>
            <SelectContent>
              {availableBadges.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" disabled={!selectedBadgeId} onClick={() => selectedBadgeId && addMutation.mutate(selectedBadgeId)}>
            <Plus className="h-4 w-4 mr-1" />הוסף
          </Button>
        </div>
      )}

      {!allBadges?.length && <p className="text-sm text-muted-foreground">אין תגיות פעילות. צרו תגיות בעמוד ניהול התגיות.</p>}
    </div>
  );
};

export default ProductBadgeManager;
