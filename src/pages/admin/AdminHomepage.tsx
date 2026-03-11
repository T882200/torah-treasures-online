import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, ArrowUp, ArrowDown, Settings, Upload, X, Image as ImageIcon } from "lucide-react";
import ImageLibraryDialog from "@/components/admin/ImageLibraryDialog";

const SECTION_TYPES = [
  { value: "hero", label: "באנר ראשי (Hero)", icon: "🖼️" },
  { value: "banner_slider", label: "סליידר באנרים", icon: "🎠" },
  { value: "categories", label: "רשת קטגוריות", icon: "📂" },
  { value: "product_carousel", label: "קרוסלת מוצרים", icon: "🛒" },
  { value: "featured_products", label: "מוצרים נבחרים (ידני)", icon: "⭐" },
  { value: "promo_banner", label: "באנר מבצע", icon: "🏷️" },
  { value: "video", label: "סרטון תדמית", icon: "🎬" },
  { value: "image_text", label: "תמונה + טקסט", icon: "🖼️" },
  { value: "text_block", label: "בלוק טקסט חופשי", icon: "📝" },
  { value: "trust_badges", label: "סימני אמון", icon: "🛡️" },
  { value: "testimonials", label: "המלצות לקוחות", icon: "💬" },
  { value: "newsletter", label: "ניוזלטר", icon: "📧" },
];

const CAROUSEL_QUERIES = [
  { value: "new_arrivals", label: "חדשים בחנות" },
  { value: "best_sellers", label: "רבי מכר" },
  { value: "on_sale", label: "מבצעים" },
];

// Image upload helper for homepage sections
const uploadHomepageImage = async (file: File, sectionId: string) => {
  const ext = file.name.split(".").pop();
  const filePath = `homepage/${sectionId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage
    .from("banners")
    .getPublicUrl(filePath);
  return publicUrl;
};

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
      case "hero": return { heading: "כותרת", subheading: "תת כותרת", cta_text: "כפתור", cta_link: "/", image_url: "" };
      case "product_carousel": return { query_type: "new_arrivals", limit: 8 };
      case "promo_banner": return { heading: "כותרת מבצע", subheading: "תיאור" };
      case "text_block": return { content: "טקסט חופשי כאן", alignment: "center" };
      case "image_text": return { image_url: "", heading: "", body: "", image_side: "right" };
      case "featured_products": return { product_ids: [], limit: 4 };
      case "banner_slider": return { banner_ids: [] };
      case "video": return { video_url: "", heading: "", subheading: "" };
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
        return <HeroConfigEditor section={section} config={config} updateConfig={updateConfig} />;
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
      case "featured_products":
        return <FeaturedProductsConfigEditor section={section} config={config} updateConfig={updateConfig} />;
      case "promo_banner":
        return (
          <div className="space-y-3">
            <div><Label>כותרת</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
            <div><Label>תת כותרת</Label><Input defaultValue={config.subheading} onBlur={(e) => updateConfig(section.id, config, "subheading", e.target.value)} /></div>
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            <div><Label>קישור לסרטון (YouTube / Vimeo)</Label><Input defaultValue={config.video_url} placeholder="https://www.youtube.com/watch?v=..." onBlur={(e) => updateConfig(section.id, config, "video_url", e.target.value)} /></div>
            <div><Label>כותרת (אופציונלי)</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
            <div><Label>תת כותרת (אופציונלי)</Label><Input defaultValue={config.subheading} onBlur={(e) => updateConfig(section.id, config, "subheading", e.target.value)} /></div>
          </div>
        );
      case "banner_slider":
        return <BannerSliderConfigEditor section={section} config={config} updateConfig={updateConfig} />;
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
        return <ImageTextConfigEditor section={section} config={config} updateConfig={updateConfig} />;
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
                } catch { toast.error("JSON לא תקין"); }
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
                } catch { toast.error("JSON לא תקין"); }
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
            <p className="text-sm text-muted-foreground">הוסף, סדר ועריך סקשנים בדף הבית</p>
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
              <DialogContent dir="rtl" className="max-w-lg">
                <DialogHeader><DialogTitle>הוסף סקשן חדש</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
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

// ── Hero config with image upload ──
const HeroConfigEditor = ({ section, config, updateConfig }: { section: any; config: any; updateConfig: any }) => {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadHomepageImage(files[0], section.id);
      updateConfig(section.id, config, "image_url", url);
      toast.success("התמונה הועלתה");
    } catch (err: any) {
      toast.error("שגיאה בהעלאת תמונה: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>תמונת רקע</Label>
        <div className="flex items-center gap-3 mt-1">
          {config.image_url && (
            <div className="relative w-32 h-20 rounded overflow-hidden border">
              <img src={config.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => updateConfig(section.id, config, "image_url", "")}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm">
              <Upload className="h-4 w-4" />
              {uploading ? "מעלה..." : "העלה תמונה"}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} disabled={uploading} />
          </label>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLibraryOpen(true)}>
            <ImageIcon className="h-4 w-4" />
            מספרייה
          </Button>
          <ImageLibraryDialog
            open={libraryOpen}
            onOpenChange={setLibraryOpen}
            onSelect={(urls) => updateConfig(section.id, config, "image_url", urls[0])}
            uploadBucket="banners"
            uploadPath={`homepage/${section.id}`}
          />
        </div>
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">או הכנס URL ידנית</Label>
          <Input defaultValue={config.image_url} placeholder="https://..." onBlur={(e) => updateConfig(section.id, config, "image_url", e.target.value)} />
        </div>
      </div>
      <div><Label>כותרת ראשית</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
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
};

// ── Featured products with product picker ──
const FeaturedProductsConfigEditor = ({ section, config, updateConfig }: { section: any; config: any; updateConfig: any }) => {
  const [search, setSearch] = useState("");
  const selectedIds: string[] = config.product_ids || [];

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, product_images(url, position)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = allProducts?.filter(
    (p: any) => p.name.includes(search) || p.slug.includes(search)
  ) || [];

  const toggleProduct = (productId: string) => {
    const newIds = selectedIds.includes(productId)
      ? selectedIds.filter((id) => id !== productId)
      : [...selectedIds, productId];
    updateConfig(section.id, config, "product_ids", newIds);
  };

  return (
    <div className="space-y-3">
      <div><Label>כמות מוצרים מקסימלית</Label><Input type="number" defaultValue={config.limit || 4} onBlur={(e) => updateConfig(section.id, config, "limit", Number(e.target.value))} /></div>
      <div>
        <Label>בחר מוצרים ({selectedIds.length} נבחרו)</Label>
        <Input placeholder="חפש מוצר..." value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
        <div className="border rounded-md mt-2 max-h-60 overflow-y-auto">
          {filteredProducts.slice(0, 50).map((product: any) => {
            const isSelected = selectedIds.includes(product.id);
            const img = product.product_images?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0]?.url;
            return (
              <button
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                className={`w-full flex items-center gap-3 p-2 text-right hover:bg-muted/50 transition-colors border-b last:border-b-0 ${isSelected ? "bg-accent/10" : ""}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-accent bg-accent text-white" : "border-muted-foreground/30"}`}>
                  {isSelected && <span className="text-xs">✓</span>}
                </div>
                {img && <img src={img} alt="" className="w-10 h-10 object-cover rounded" />}
                <span className="text-sm flex-1 truncate">{product.name}</span>
                <span className="text-xs text-muted-foreground">₪{product.price}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Banner slider config ──
const BannerSliderConfigEditor = ({ section, config, updateConfig }: { section: any; config: any; updateConfig: any }) => {
  const selectedIds: string[] = config.banner_ids || [];

  const { data: banners } = useQuery({
    queryKey: ["all-promo-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const toggleBanner = (bannerId: string) => {
    const newIds = selectedIds.includes(bannerId)
      ? selectedIds.filter((id) => id !== bannerId)
      : [...selectedIds, bannerId];
    updateConfig(section.id, config, "banner_ids", newIds);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">בחר באנרים מתוך רשימת הבאנרים הקיימים. אם לא נבחר אף באנר, כל הבאנרים הפעילים יוצגו.</p>
      <div className="border rounded-md max-h-60 overflow-y-auto">
        {banners?.map((banner: any) => {
          const isSelected = selectedIds.includes(banner.id);
          return (
            <button
              key={banner.id}
              onClick={() => toggleBanner(banner.id)}
              className={`w-full flex items-center gap-3 p-3 text-right hover:bg-muted/50 transition-colors border-b last:border-b-0 ${isSelected ? "bg-accent/10" : ""}`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-accent bg-accent text-white" : "border-muted-foreground/30"}`}>
                {isSelected && <span className="text-xs">✓</span>}
              </div>
              <div
                className="w-16 h-10 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: banner.bg_color || "#1a2744", color: banner.text_color || "#fff" }}
              >
                {banner.image_url ? <img src={banner.image_url} alt="" className="w-full h-full object-cover rounded" /> : "באנר"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{banner.title}</p>
                <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${banner.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {banner.is_active ? "פעיל" : "מושבת"}
              </span>
            </button>
          );
        })}
        {(!banners || banners.length === 0) && (
          <p className="p-4 text-sm text-muted-foreground text-center">אין באנרים. צור באנרים בעמוד ניהול באנרים.</p>
        )}
      </div>
    </div>
  );
};

// ── Image+text config with image upload ──
const ImageTextConfigEditor = ({ section, config, updateConfig }: { section: any; config: any; updateConfig: any }) => {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadHomepageImage(files[0], section.id);
      updateConfig(section.id, config, "image_url", url);
      toast.success("התמונה הועלתה");
    } catch (err: any) {
      toast.error("שגיאה בהעלאת תמונה: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div><Label>כותרת</Label><Input defaultValue={config.heading} onBlur={(e) => updateConfig(section.id, config, "heading", e.target.value)} /></div>
      <div><Label>טקסט</Label><Textarea defaultValue={config.body} onBlur={(e) => updateConfig(section.id, config, "body", e.target.value)} rows={3} /></div>
      <div>
        <Label>תמונה</Label>
        <div className="flex items-center gap-3 mt-1">
          {config.image_url && (
            <div className="relative w-24 h-16 rounded overflow-hidden border">
              <img src={config.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => updateConfig(section.id, config, "image_url", "")}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm">
              <Upload className="h-4 w-4" />
              {uploading ? "מעלה..." : "העלה תמונה"}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} disabled={uploading} />
          </label>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLibraryOpen(true)}>
            <ImageIcon className="h-4 w-4" />
            מספרייה
          </Button>
          <ImageLibraryDialog
            open={libraryOpen}
            onOpenChange={setLibraryOpen}
            onSelect={(urls) => updateConfig(section.id, config, "image_url", urls[0])}
            uploadBucket="banners"
            uploadPath={`homepage/${section.id}`}
          />
        </div>
        <Input className="mt-2" defaultValue={config.image_url} placeholder="או הכנס URL..." onBlur={(e) => updateConfig(section.id, config, "image_url", e.target.value)} />
      </div>
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
};

export default AdminHomepage;
