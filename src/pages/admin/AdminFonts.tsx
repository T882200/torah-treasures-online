import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, Search, Type } from "lucide-react";

const POPULAR_GOOGLE_FONTS = [
  "Frank Ruhl Libre", "Heebo", "Rubik", "Assistant", "Noto Sans Hebrew",
  "Open Sans", "Roboto", "Lato", "Montserrat", "Playfair Display",
  "Merriweather", "Poppins", "Inter", "Raleway", "Oswald",
  "Nunito", "PT Serif", "Libre Baskerville", "Cormorant Garamond",
  "Alef", "David Libre", "Secular One", "Suez One", "Varela Round",
  "Bellefair", "Amatic SC", "Karantina", "Tinos", "Noto Serif Hebrew",
];

const FONT_WEIGHTS = [
  { value: 100, label: "Thin (100)" },
  { value: 200, label: "Extra Light (200)" },
  { value: 300, label: "Light (300)" },
  { value: 400, label: "Regular (400)" },
  { value: 500, label: "Medium (500)" },
  { value: 600, label: "Semi Bold (600)" },
  { value: 700, label: "Bold (700)" },
  { value: 800, label: "Extra Bold (800)" },
  { value: 900, label: "Black (900)" },
];

const AdminFonts = () => {
  const queryClient = useQueryClient();
  const [googleSearch, setGoogleSearch] = useState("");
  const [previewText, setPreviewText] = useState("ספרי קודש — The quick brown fox jumps");

  const { data: fonts, isLoading } = useQuery({
    queryKey: ["site-fonts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_fonts")
        .select("*, custom_font_files(*)");
      if (error) throw error;
      return data;
    },
  });

  const updateFont = useMutation({
    mutationFn: async ({
      role,
      familyName,
      source,
      googleUrl,
    }: {
      role: string;
      familyName: string;
      source: string;
      googleUrl?: string;
    }) => {
      const { error } = await supabase
        .from("site_fonts")
        .upsert(
          { role, family_name: familyName, source, google_url: googleUrl || null, updated_at: new Date().toISOString() },
          { onConflict: "role" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-fonts"] });
      toast.success("הפונט עודכן בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון הפונט"),
  });

  const uploadFontFile = async (fontId: string, weight: number, style: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${fontId}/${weight}-${style}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("custom-fonts")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("custom-fonts").getPublicUrl(path);

    const { error } = await supabase.from("custom_font_files").upsert(
      { font_id: fontId, weight, style, file_url: urlData.publicUrl },
      { onConflict: "font_id,weight,style" } as any
    );
    if (error) {
      // If upsert doesn't work on composite, delete and insert
      await supabase.from("custom_font_files").delete().eq("font_id", fontId).eq("weight", weight).eq("style", style);
      const { error: insertError } = await supabase.from("custom_font_files").insert({ font_id: fontId, weight, style, file_url: urlData.publicUrl });
      if (insertError) throw insertError;
    }

    queryClient.invalidateQueries({ queryKey: ["site-fonts"] });
    toast.success(`משקל ${weight} הועלה בהצלחה`);
  };

  const deleteFontFile = async (fileId: string) => {
    const { error } = await supabase.from("custom_font_files").delete().eq("id", fileId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["site-fonts"] });
    toast.success("קובץ הפונט נמחק");
  };

  const selectGoogleFont = (role: string, familyName: string) => {
    const weights = "300;400;500;600;700;900";
    const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familyName)}:wght@${weights}&display=swap`;
    updateFont.mutate({ role, familyName, source: "google", googleUrl });
  };

  const switchToCustom = async (role: string, familyName: string) => {
    // First ensure a site_fonts record exists
    const { data, error } = await supabase
      .from("site_fonts")
      .upsert(
        { role, family_name: familyName, source: "custom", google_url: null, updated_at: new Date().toISOString() },
        { onConflict: "role" }
      )
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["site-fonts"] });
    toast.success("מצב פונט מותאם — העלה קבצי פונט");
    return data;
  };

  const displayFont = fonts?.find((f: any) => f.role === "display");
  const bodyFont = fonts?.find((f: any) => f.role === "body");

  const filteredGoogleFonts = POPULAR_GOOGLE_FONTS.filter((f) =>
    f.toLowerCase().includes(googleSearch.toLowerCase())
  );

  const renderFontSection = (role: string, label: string, currentFont: any) => (
    <Card key={role}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5 text-accent" />
          {label} — {currentFont?.family_name || "לא הוגדר"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">תצוגה מקדימה:</p>
          <p
            className="text-2xl"
            style={{
              fontFamily: currentFont?.family_name
                ? `'${currentFont.family_name}', sans-serif`
                : "inherit",
            }}
          >
            {previewText}
          </p>
        </div>

        {/* Source selector */}
        <div className="flex gap-2">
          <Button
            variant={currentFont?.source === "google" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (currentFont) selectGoogleFont(role, currentFont.family_name);
            }}
          >
            <Search className="h-4 w-4 ml-1" />
            Google Fonts
          </Button>
          <Button
            variant={currentFont?.source === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => switchToCustom(role, currentFont?.family_name || "CustomFont")}
          >
            <Upload className="h-4 w-4 ml-1" />
            העלאה מהמחשב
          </Button>
        </div>

        {/* Google Fonts picker */}
        {currentFont?.source !== "custom" && (
          <div className="space-y-2">
            <Input
              placeholder="חפש פונט מ-Google Fonts..."
              value={googleSearch}
              onChange={(e) => setGoogleSearch(e.target.value)}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {filteredGoogleFonts.map((fontName) => (
                <button
                  key={fontName}
                  onClick={() => selectGoogleFont(role, fontName)}
                  className={`p-3 text-right rounded-md border text-sm transition-colors ${
                    currentFont?.family_name === fontName
                      ? "border-accent bg-accent/10 text-accent-foreground"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {fontName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom font upload */}
        {currentFont?.source === "custom" && (
          <div className="space-y-3">
            <div>
              <Label>שם משפחת הפונט</Label>
              <Input
                defaultValue={currentFont?.family_name}
                onBlur={(e) => {
                  if (e.target.value !== currentFont?.family_name) {
                    updateFont.mutate({ role, familyName: e.target.value, source: "custom" });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>קבצי משקלים (TTF, OTF, WOFF, WOFF2)</Label>
              {FONT_WEIGHTS.map((w) => {
                const existing = currentFont?.custom_font_files?.find(
                  (f: any) => f.weight === w.value && f.style === "normal"
                );
                return (
                  <div key={w.value} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <span className="text-sm w-36">{w.label}</span>
                    {existing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-green-600">✓ הועלה</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFontFile(existing.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && currentFont?.id) {
                              try {
                                await uploadFontFile(currentFont.id, w.value, "normal", file);
                              } catch {
                                toast.error("שגיאה בהעלאת הקובץ");
                              }
                            }
                          }}
                        />
                        <span className="text-xs text-accent cursor-pointer hover:underline">העלה קובץ</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="ניהול פונטים">
      <div className="space-y-4">
        <div>
          <Label>טקסט לתצוגה מקדימה</Label>
          <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
        </div>
        {isLoading ? (
          <p>טוען...</p>
        ) : (
          <div className="space-y-6">
            {renderFontSection("display", "פונט כותרות (Display)", displayFont)}
            {renderFontSection("body", "פונט גוף (Body)", bodyFont)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFonts;
