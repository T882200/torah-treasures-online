import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props { productId: string; }

const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex gap-0.5" dir="ltr">
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(i)}
        className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
      >
        <Star className={`h-5 w-5 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      </button>
    ))}
  </div>
);

const ProductReviews = ({ productId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ author_name: "", title: "", content: "", rating: 5 });

  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        author_name: form.author_name,
        title: form.title || null,
        content: form.content || null,
        rating: form.rating,
        user_id: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הביקורת נשלחה לאישור!");
      setShowForm(false);
      setForm({ author_name: "", title: "", content: "", rating: 5 });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-8 border-t border-border pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">ביקורות ודירוגים</h2>
          {reviews && reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(avgRating)} readonly />
              <span className="text-sm text-muted-foreground">({reviews.length} ביקורות)</span>
            </div>
          )}
        </div>
        {user && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>כתוב ביקורת</Button>
        )}
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Label>דירוג:</Label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
          </div>
          <Input placeholder="שם" value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} />
          <Input placeholder="כותרת (אופציונלי)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea placeholder="תוכן הביקורת" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} />
          <div className="flex gap-2">
            <Button size="sm" variant="gold" disabled={!form.author_name || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending ? "שולח..." : "שלח"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>ביטול</Button>
          </div>
        </div>
      )}

      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{review.author_name}</span>
                  {review.is_verified_purchase && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">רכישה מאומתת</span>}
                </div>
                <StarRating value={review.rating} readonly />
              </div>
              {review.title && <p className="font-medium text-foreground mb-1">{review.title}</p>}
              {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
              <p className="text-xs text-muted-foreground mt-2">{new Date(review.created_at!).toLocaleDateString("he-IL")}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">אין ביקורות עדיין. {user ? "היו הראשונים לכתוב!" : "התחברו כדי לכתוב ביקורת."}</p>
      )}
    </section>
  );
};

export default ProductReviews;
