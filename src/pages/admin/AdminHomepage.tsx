import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ChevronDown, Eye, EyeOff, ArrowUp, ArrowDown, Settings } from "lucide-react";

const SECTION_TYPES = [
  { value: "hero", label: "באנר ראשי (Hero)", icon: "🖼️" },
  { value: "categories", label: "רשת קטגוריות", icon: "📂" },
  { value: "product_carousel", label: "קרוסלת מוצרים", icon: "🛒" },
  { value: "promo_banner", label: "באנר מבצע", icon: "🏷️" },
  { value: "newsletter", label: "ניוזלטר", icon: "📧" },
  { value: "text_block", label: "בלוק טקסט חופשי", icon: "📝" },
  { value: "image_text", label: "תמונה + טקסט", icon: "🖼️" },
  { value: "featured_products", label: "מוצרים נבחרים (ידני)", icon: "⭐" },
  { value: "banner_slider", label: "סליידר באנרים", icon: "🎠" },
  { value: "trust_badges", label: "סימני אמון", icon: "🛡️" },
  { value: "testimonials", label: "המלצות לקוחות", icon: "💬" },
];

const CAROUSEL_QUERIES = [
  { value: "new_arrivals", label: "חדשים בחנות" },
  { value: "best_sellers", label: "רבי מכר" },
  { value: "on_sale", label: "מבצעים" },
];

const AdminHomepage = () => {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newType, setNewType] = useState("text_block");

  const { data: sections, isLoading } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("homepage_sections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success("הסקשן עודכן");
    },
  });

  const addSection = useMutation({
    mutationFn: async () => {
      const pos = sections?.length || 0;
      const typeDef = SECTION_TYPES.find((t) => t.value === newType);
      const { error } = await supabase.from("homepage_sections").insert({
        type: newType,
        title: typeDef?.label || "סקשן חדש",
        config: getDefaultConfig(newType),
        position: pos,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      setAddDialogOpen(false);
      toast.success("סקשן נוסף");
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success("סקשן נמחק");
    },
  });

  const moveSection = async (id: string, direction: "up" | "down") => {
    if (!sections) return;
    const idx = sections.findIndex((s: any) => s.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const updates = [
      { id: sections[idx].id, position: sections[swapIdx].position },
      { id: sections[swapIdx].id, position: sections[idx].position },
    ];

    for (const u of updates) {
      await supabase.from("homepage_sections").update({ position: u.position }).eq("id", u.id);
    }
    queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
  };

  const updateConfig = (id: string, currentConfig: any, key: string, value: any) => {
    const newConfig = { ...currentConfig, [key]: value };
    updateSection.mutate({ id, updates: { config: newConfig } });
  };

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case "hero": return { heading: "כותרת", subheading: "תת כותרת", cta_text: "כפתור", cta_link: "/" };
      case "product_carousel": return { query_type: "new_arrivals", limit: 8 };
      case "promo_banner": return { heading: "כותרת מבצע", subheading: "תיאור" };
      case "text_block": return { content: "טקסט חופשי כאן", alignment: "center" };
      case "image_text": return { image_url: "", heading: "", body: "", image_side: "right" };
      case "featured_products": return { product_ids: [], limit: 4 };
      case "banner_slider": return { banner_ids: [] };
      case "trust_badges": return { items: [{ icon: "🚚", title: "משלוח מהיר", subtitle: "3-5 ימי עסקים" }, { icon: "🔒", title: "תשלום מאובטח", subtitle: "SSL מלא" }, { icon: "↩️", title: "החזרות", subtitle: "14 יום" }] };
      case "testimonials": return { items: [{ name: "", text: "", rating: 5 }] };
      default: return {};
    }
  };

  const renderConfigEditor = (section: any) => {
    const config = section.config || {};
    const type = section.type;

    switch (type) {
      case "hero":
        return (
          <div className="space-y-3">
            <div><Label>כותרת ראשית</Label><Input value={config.heading || ""} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} defaultValue={config.heading} /></div>
            <div><Label>תת כותרת</Label><Input defaultValue={config.subheading} onBlur={(e) => updateConfig(section.id, config, "subheading", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>טקסט כפתור 1</Label><Input defaultValue={config.cta_text} onBlur={(e) => updateConfig(section.id, config, "cta_text", e.target.value)} /></div>
              <div><Label>קישור כפתור 1</Label><Input defaultValue={config.cta_link} onBlur={(e) => updateConfig(section.id, config, "cta_link", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>טקסט כפתור 2</Label><Input defaultValue={config.cta2_text} onBlur={(e) => updateConfig(section.id, config, "cta2_text", e.target.value)} /></div>
              <div><Label>קישור כפתור 2</Label><Input defaultValue={config.cta2_link} onBlur={(e) => updateConfig(section.id, config, "cta2_link", e.target.value)} /></div>
            </div>
          </div>
        );

      case "product_carousel":
        return (
          <div className="space-y-3">
            <div>
              <Label>סוג שאילתה</Label>
              <Select defaultValue={config.query_type} onValueChange={(v) => updateConfig(section.id, config, "query_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAROUSEL_QUERIES.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>כמות מוצרים</Label><Input type="number" defaultValue={config.limit || 8} onBlur={(e) => updateConfig(section.id, config, "limit", Number(e.target.value))} /></div>
          </div>
        );

      case "promo_banner":
        return (
          <div className="space-y-3">
            <div><Label>כותרת</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
            <div><Label>תת כותרת</Label><Input defaultValue={config.subheading} onBlur={(e) => updateConfig(section.id, config, "subheading", e.target.value)} /></div>
          </div>
        );

      case "text_block":
        return (
          <div className="space-y-3">
            <div><Label>תוכן</Label><Textarea defaultValue={config.content} onBlur={(e) => updateConfig(section.id, config, "content", e.target.value)} rows={4} /></div>
            <div>
              <Label>יישור</Label>
              <Select defaultValue={config.alignment || "center"} onValueChange={(v) => updateConfig(section.id, config, "alignment", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">ימין</SelectItem>
                  <SelectItem value="center">מרכז</SelectItem>
                  <SelectItem value="left">שמאל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "image_text":
        return (
          <div className="space-y-3">
            <div><Label>כותרת</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
            <div><Label>טקסט</Label><Textarea defaultValue={config.body} onBlur={(e) => updateConfig(section.id, config, "body", e.target.value)} rows={3} /></div>
            <div><Label>URL תמונה</Label><Input defaultValue={config.image_url} onBlur={(e) => updateConfig(section.id, config, "image_url", e.target.value)} /></div>
            <div>
              <Label>צד תמונה</Label>
              <Select defaultValue={config.image_side || "right"} onValueChange={(v) => updateConfig(section.id, config, "image_side", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">ימין</SelectItem>
                  <SelectItem value="left">שמאל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "trust_badges":
        return (
          <div className="space-y-2">
            <Label>סימני אמון (JSON)</Label>
            <Textarea
              defaultValue={JSON.stringify(config.items || [], null, 2)}
              rows={6}
              onBlur={(e) => {
                try {
                  const items = JSON.parse(e.target.value);
                  updateConfig(section.id, config, "items", items);
                } catch {
                  toast.error("JSON לא תקין");
                }
              }}
            />
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-2">
            <Label>המלצות (JSON)</Label>
            <Textarea
              defaultValue={JSON.stringify(config.items || [], null, 2)}
              rows={6}
              onBlur={(e) => {
                try {
                  const items = JSON.parse(e.target.value);
                  updateConfig(section.id, config, "items", items);
                } catch {
                  toast.error("JSON לא תקין");
                }
              }}
            />
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">אין הגדרות נוספות לסקשן זה</p>;
    }
  };

  return (
    <AdminLayout title="עורך דף הבית">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">גרור, הוסף ועריך סקשנים בדף הבית</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/", "_blank")}>
              <Eye className="h-4 w-4 ml-1" />
              תצוגה מקדימה
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 ml-1" />הוסף סקשן</Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader><DialogTitle>הוסף סקשן חדש</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  {SECTION_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => setNewType(st.value)}
                      className={`p-4 rounded-lg border text-right transition-colors ${
                        newType === st.value ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                      }`}
                    >
                      <span className="text-2xl">{st.icon}</span>
                      <p className="text-sm font-bold mt-1">{st.label}</p>
                    </button>
                  ))}
                </div>
                <Button onClick={() => addSection.mutate()}>הוסף</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <p>טוען...</p>
        ) : (
          <div className="space-y-3">
            {sections?.map((section: any, idx: number) => {
              const typeDef = SECTION_TYPES.find((t) => t.value === section.type);
              return (
                <Collapsible key={section.id}>
                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => moveSection(section.id, "up")}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled={idx === (sections?.length || 0) - 1} onClick={() => moveSection(section.id, "down")}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-xl">{typeDef?.icon}</span>
                        <div className="flex-1">
                          <Input
                            className="font-bold border-none p-0 h-auto text-sm bg-transparent"
                            defaultValue={section.title}
                            onBlur={(e) => {
                              if (e.target.value !== section.title) {
                                updateSection.mutate({ id: section.id, updates: { title: e.target.value } });
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{typeDef?.label}</span>
                        </div>
                        <Switch
                          checked={section.is_active}
                          onCheckedChange={(v) => updateSection.mutate({ id: section.id, updates: { is_active: v } })}
                        />
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <Button variant="ghost" size="sm" onClick={() => deleteSection.mutate(section.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 border-t border-border">
                          <div className="pt-4">
                            {renderConfigEditor(section)}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHomepage;
