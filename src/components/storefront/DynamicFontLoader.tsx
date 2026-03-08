import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DynamicFontLoader = () => {
  const { data: fonts } = useQuery({
    queryKey: ["site-fonts-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_fonts")
        .select("*, custom_font_files(*)");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  useEffect(() => {
    if (!fonts || fonts.length === 0) return;

    const displayFont = fonts.find((f: any) => f.role === "display");
    const bodyFont = fonts.find((f: any) => f.role === "body");

    // Remove old dynamic link elements
    document.querySelectorAll("[data-dynamic-font]").forEach((el) => el.remove());

    // Remove old @font-face style
    document.querySelectorAll("[data-custom-font-face]").forEach((el) => el.remove());

    const fontFaces: string[] = [];

    [displayFont, bodyFont].forEach((font: any) => {
      if (!font) return;

      if (font.source === "google" && font.google_url) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = font.google_url;
        link.setAttribute("data-dynamic-font", font.role);
        document.head.appendChild(link);
      } else if (font.source === "custom" && font.custom_font_files?.length > 0) {
        font.custom_font_files.forEach((file: any) => {
          const format = file.file_url.endsWith(".woff2")
            ? "woff2"
            : file.file_url.endsWith(".woff")
            ? "woff"
            : file.file_url.endsWith(".otf")
            ? "opentype"
            : "truetype";

          fontFaces.push(`
            @font-face {
              font-family: '${font.family_name}';
              src: url('${file.file_url}') format('${format}');
              font-weight: ${file.weight};
              font-style: ${file.style};
              font-display: swap;
            }
          `);
        });
      }
    });

    if (fontFaces.length > 0) {
      const style = document.createElement("style");
      style.setAttribute("data-custom-font-face", "true");
      style.textContent = fontFaces.join("\n");
      document.head.appendChild(style);
    }

    // Apply CSS variables
    const root = document.documentElement;
    if (displayFont) {
      root.style.setProperty("--font-display", `'${displayFont.family_name}', serif`);
    }
    if (bodyFont) {
      root.style.setProperty("--font-body", `'${bodyFont.family_name}', sans-serif`);
    }
  }, [fonts]);

  return null; // No visual output
};

export default DynamicFontLoader;
