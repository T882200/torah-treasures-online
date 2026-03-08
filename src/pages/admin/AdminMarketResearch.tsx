import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, FlaskConical, Clock, Play, Loader2 } from "lucide-react";

const AdminMarketResearch = () => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["market-research-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("market_research_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    api_provider: settings?.api_provider || "openrouter",
    api_key: "",
    custom_prompt: settings?.custom_prompt || "סקור את השוק עבור המוצר הבא וספק: 1) מחירים של מתחרים 2) ספקי דרופשיפינג פוטנציאליים 3) המלצות מחיר",
    schedule_type: settings?.schedule_type || "manual",
    schedule_day: settings?.schedule_day || 1,
    schedule_hour: settings?.schedule_hour || 9,
  });

  // Sync form when settings load
  useState(() => {
    if (settings) {
      setForm({
        api_provider: settings.api_provider || "openrouter",
        api_key: "",
        custom_prompt: settings.custom_prompt || form.custom_prompt,
        schedule_type: settings.schedule_type || "manual",
        schedule_day: settings.schedule_day || 1,
        schedule_hour: settings.schedule_hour || 9,
      });
    }
  });

  const { data: results } = useQuery({
    queryKey: ["market-research-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_research_results")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        api_provider: form.api_provider,
        custom_prompt: form.custom_prompt,
        schedule_type: form.schedule_type,
        schedule_day: form.schedule_day,
        schedule_hour: form.schedule_hour,
        updated_at: new Date().toISOString(),
      };
      if (form.api_key) payload.api_key_encrypted = form.api_key; // In production, encrypt this

      if (settings?.id) {
        const { error } = await supabase.from("market_research_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("market_research_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-research-settings"] });
      toast.success("ההגדרות נשמרו");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [runningResearch, setRunningResearch] = useState(false);
  const runResearch = async () => {
    setRunningResearch(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-research", {
        body: { mode: "manual" },
      });
      if (error) throw error;
      toast.success("סקר שוק הושלם!");
      queryClient.invalidateQueries({ queryKey: ["market-research-results"] });
    } catch (err: any) {
      toast.error(`שגיאה: ${err.message}`);
    } finally {
      setRunningResearch(false);
    }
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

  return (
    <AdminLayout title="סקר שוק וניתוח מתחרים">
      <div className="max-w-4xl space-y-6">
        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-accent" />
              הגדרות API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>ספק LLM</Label>
                <Select value={form.api_provider} onValueChange={v => setForm(p => ({ ...p, api_provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter (Claude, GPT ועוד)</SelectItem>
                    <SelectItem value="claude">Anthropic Claude ישיר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מפתח API</Label>
                <Input
                  type="password"
                  value={form.api_key}
                  onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                  placeholder={settings?.api_key_encrypted ? "••••••• (מוגדר)" : "הזן מפתח API"}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.api_provider === "openrouter" ? "קבל מפתח מ-openrouter.ai" : "קבל מפתח מ-console.anthropic.com"}
                </p>
              </div>
            </div>

            <div>
              <Label>פרומפט מותאם אישית</Label>
              <Textarea
                value={form.custom_prompt}
                onChange={e => setForm(p => ({ ...p, custom_prompt: e.target.value }))}
                rows={5}
                placeholder="הנחיות למודל..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                המשתנים הזמינים: {"{{product_name}}"}, {"{{product_price}}"}, {"{{product_description}}"}, {"{{category}}"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              תזמון בדיקות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>תדירות</Label>
                <Select value={form.schedule_type} onValueChange={v => setForm(p => ({ ...p, schedule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">ידני בלבד</SelectItem>
                    <SelectItem value="daily">יומי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.schedule_type === "weekly" && (
                <div>
                  <Label>יום בשבוע</Label>
                  <Select value={String(form.schedule_day)} onValueChange={v => setForm(p => ({ ...p, schedule_day: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"].map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.schedule_type === "monthly" && (
                <div>
                  <Label>יום בחודש</Label>
                  <Input type="number" min={1} max={28} value={form.schedule_day} onChange={e => setForm(p => ({ ...p, schedule_day: parseInt(e.target.value) || 1 }))} />
                </div>
              )}
              {form.schedule_type !== "manual" && (
                <div>
                  <Label>שעה</Label>
                  <Input type="number" min={0} max={23} value={form.schedule_hour} onChange={e => setForm(p => ({ ...p, schedule_hour: parseInt(e.target.value) || 9 }))} />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="gold" className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "שומר..." : "שמור הגדרות"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={runResearch} disabled={runningResearch}>
                {runningResearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                הפעל סקר עכשיו
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>תוצאות אחרונות</CardTitle>
          </CardHeader>
          <CardContent>
            {results && results.length > 0 ? (
              <div className="space-y-4">
                {results.map((r: any) => (
                  <div key={r.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-display font-bold">{r.products?.name || "מוצר לא ידוע"}</h4>
                      <span className="text-xs text-muted-foreground">{r.created_at && formatDate(r.created_at)}</span>
                    </div>
                    {r.recommendation && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.recommendation}</p>
                    )}
                    {r.competitor_prices && (
                      <div className="mt-2">
                        <span className="text-xs font-bold text-foreground">מחירי מתחרים:</span>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(r.competitor_prices, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">
                אין תוצאות עדיין. הגדר מפתח API והפעל סקר שוק.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketResearch;
