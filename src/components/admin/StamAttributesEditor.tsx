import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, ScrollText } from "lucide-react";

interface Props {
  productId: string;
}

const NUSACH_OPTIONS = ["אשכנזי", "ספרדי", "חב\"ד", "תימני", "אריז\"ל"];
const KOSHER_OPTIONS = ["כשר", "מהודר", "מהודר מן המהודר"];
const SCRIPT_OPTIONS = ["בית יוסף", "וועליש", "אר\"י"];
const HOUSING_OPTIONS = ["גסות", "דקות", "פשוטים מהודרים"];

const StamAttributesEditor = ({ productId }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nusach: "",
    kosher_level: "",
    script_type: "",
    parchment_size_cm: "",
    certificate_info: "",
    sofer_name: "",
    beit_din: "",
    housing_type: "",
    is_checked_by_computer: true,
    is_checked_by_human: true,
    additional_notes: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["stam-attrs-admin", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stam_attributes")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setForm({
        nusach: existing.nusach || "",
        kosher_level: existing.kosher_level || "",
        script_type: existing.script_type || "",
        parchment_size_cm: existing.parchment_size_cm ? String(existing.parchment_size_cm) : "",
        certificate_info: existing.certificate_info || "",
        sofer_name: existing.sofer_name || "",
        beit_din: existing.beit_din || "",
        housing_type: existing.housing_type || "",
        is_checked_by_computer: existing.is_checked_by_computer ?? true,
        is_checked_by_human: existing.is_checked_by_human ?? true,
        additional_notes: existing.additional_notes || "",
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: productId,
        nusach: form.nusach || null,
        kosher_level: form.kosher_level || null,
        script_type: form.script_type || null,
        parchment_size_cm: form.parchment_size_cm ? parseFloat(form.parchment_size_cm) : null,
        certificate_info: form.certificate_info || null,
        sofer_name: form.sofer_name || null,
        beit_din: form.beit_din || null,
        housing_type: form.housing_type || null,
        is_checked_by_computer: form.is_checked_by_computer,
        is_checked_by_human: form.is_checked_by_human,
        additional_notes: form.additional_notes || null,
      };

      if (existing) {
        const { error } = await supabase.from("stam_attributes").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stam_attributes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stam-attrs-admin", productId] });
      toast.success("פרטי סת\"ם נשמרו");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
      <h2 className="font-display font-bold text-lg flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-accent" />
        פרטי סת״ם (אופציונלי)
      </h2>
      <p className="text-sm text-muted-foreground">מלא שדות אלו רק עבור מוצרי סת"ם — תפילין, מזוזות, מגילות, ספרי תורה.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>נוסח / עדה</Label>
          <Select value={form.nusach} onValueChange={(v) => setForm(p => ({ ...p, nusach: v }))}>
            <SelectTrigger><SelectValue placeholder="בחר נוסח" /></SelectTrigger>
            <SelectContent>
              {NUSACH_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>רמת כשרות</Label>
          <Select value={form.kosher_level} onValueChange={(v) => setForm(p => ({ ...p, kosher_level: v }))}>
            <SelectTrigger><SelectValue placeholder="בחר רמת כשרות" /></SelectTrigger>
            <SelectContent>
              {KOSHER_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>סוג כתב</Label>
          <Select value={form.script_type} onValueChange={(v) => setForm(p => ({ ...p, script_type: v }))}>
            <SelectTrigger><SelectValue placeholder="בחר סוג כתב" /></SelectTrigger>
            <SelectContent>
              {SCRIPT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>סוג בתים (תפילין)</Label>
          <Select value={form.housing_type} onValueChange={(v) => setForm(p => ({ ...p, housing_type: v }))}>
            <SelectTrigger><SelectValue placeholder="בחר סוג בתים" /></SelectTrigger>
            <SelectContent>
              {HOUSING_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>שם הסופר</Label>
          <Input value={form.sofer_name} onChange={e => setForm(p => ({ ...p, sofer_name: e.target.value }))} />
        </div>
        <div>
          <Label>בד״ץ מפקח</Label>
          <Input value={form.beit_din} onChange={e => setForm(p => ({ ...p, beit_din: e.target.value }))} />
        </div>
        <div>
          <Label>גודל קלף (ס״מ)</Label>
          <Input type="number" step="0.1" value={form.parchment_size_cm} onChange={e => setForm(p => ({ ...p, parchment_size_cm: e.target.value }))} dir="ltr" />
        </div>
      </div>

      <div>
        <Label>פרטי תעודת הכשר</Label>
        <Textarea value={form.certificate_info} onChange={e => setForm(p => ({ ...p, certificate_info: e.target.value }))} rows={3} />
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_checked_by_computer} onCheckedChange={v => setForm(p => ({ ...p, is_checked_by_computer: v }))} />
          <Label>נבדק במחשב</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_checked_by_human} onCheckedChange={v => setForm(p => ({ ...p, is_checked_by_human: v }))} />
          <Label>נבדק ידנית</Label>
        </div>
      </div>

      <div>
        <Label>הערות נוספות</Label>
        <Textarea value={form.additional_notes} onChange={e => setForm(p => ({ ...p, additional_notes: e.target.value }))} rows={2} />
      </div>

      <Button type="button" variant="gold" className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "שומר..." : "שמור פרטי סת\"ם"}
      </Button>
    </div>
  );
};

export default StamAttributesEditor;
