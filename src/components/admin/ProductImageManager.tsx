import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, GripVertical, Image as ImageIcon, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ImageLibraryDialog from "@/components/admin/ImageLibraryDialog";
import {
  extractImageUrl,
  extractImageUrlFromHtml,
  fetchImageFromUrl,
} from "@/lib/fetchExternalImage";

interface ProductImageManagerProps {
  productId: string;
}

const ProductImageManager = ({ productId }: ProductImageManagerProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: images } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("product_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
      toast.success("התמונה נמחקה");
    },
  });

  // Accepts both FileList (from input) and File[] (from external fetch)
  const handleUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploading(true);

    try {
      const currentCount = images?.length || 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${productId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase.from("product_images").insert({
          product_id: productId,
          url: publicUrl,
          position: currentCount + i,
          is_video: file.type.startsWith("video/"),
        });
        if (dbError) throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
      toast.success(`${fileArray.length} תמונות הועלו בהצלחה`);
    } catch (err: any) {
      toast.error(`שגיאה בהעלאה: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [productId, images, queryClient]);

  // Enhanced drop: local files first, then external URL fallback
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Priority 1: Local files
    const localFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (localFiles.length > 0) {
      handleUpload(localFiles);
      return;
    }

    // Priority 2: External image URL from drag
    const url = extractImageUrl(e.dataTransfer);
    if (url) {
      setUploading(true);
      try {
        toast.info("מוריד תמונה מכתובת חיצונית...");
        const file = await fetchImageFromUrl(url);
        await handleUpload([file]);
      } catch (err: any) {
        toast.error(err.message || "שגיאה בהורדת תמונה חיצונית");
        setUploading(false);
      }
      return;
    }

    toast.error("לא זוהה קובץ תמונה בגרירה");
  }, [handleUpload]);

  // Paste handler: clipboard blob or HTML with img URL
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);

    // Priority 1: Image blob directly in clipboard
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) {
        const ext = blob.type.split("/")[1]?.split(";")[0] || "png";
        const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
        handleUpload([file]);
        return;
      }
    }

    // Priority 2: HTML with <img src="...">
    const htmlItem = items.find((item) => item.type === "text/html");
    if (htmlItem) {
      e.preventDefault();
      const html = await new Promise<string>((resolve) => {
        htmlItem.getAsString(resolve);
      });
      const url = extractImageUrlFromHtml(html);
      if (url) {
        setUploading(true);
        try {
          toast.info("מוריד תמונה מכתובת חיצונית...");
          const file = await fetchImageFromUrl(url);
          await handleUpload([file]);
        } catch (err: any) {
          toast.error(err.message || "שגיאה בהורדת תמונה חיצונית");
          setUploading(false);
        }
        return;
      }
    }
  }, [handleUpload]);

  const handleLibrarySelect = useCallback(async (urls: string[]) => {
    const currentCount = images?.length || 0;
    let pos = currentCount;
    for (const url of urls) {
      const { error } = await supabase.from("product_images").insert({
        product_id: productId,
        url,
        position: pos++,
        is_video: false,
      });
      if (error) {
        toast.error(`שגיאה בשיוך תמונה: ${error.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
    toast.success(`${urls.length} תמונות שויכו למוצר`);
  }, [productId, images, queryClient]);

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
      <h2 className="font-display font-bold text-lg">תמונות</h2>

      {/* Existing images */}
      {images && images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={img.url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                <button
                  onClick={() => deleteImage.mutate(img.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {img.position === 0 && (
                <span className="absolute top-1 right-1 bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                  ראשית
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone — supports local files, external drag, and paste */}
      <div
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onPaste={handlePaste}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-accent/30 ${
          isDragging
            ? "border-accent bg-accent/10 ring-2 ring-accent/30"
            : "border-border hover:border-accent"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*,video/mp4";
          input.onchange = () => handleUpload(input.files);
          input.click();
        }}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 mx-auto mb-2 text-accent animate-spin" />
        ) : (
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading
            ? "מעלה..."
            : isDragging
              ? "שחרר כדי להעלות"
              : "גרור תמונות לכאן, הדבק (Ctrl+V), או לחץ להעלאה"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP, MP4 — גם מאתרים חיצוניים
        </p>
      </div>

      {/* Pick from library */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setLibraryOpen(true)}
      >
        <ImageIcon className="h-4 w-4" />
        בחר מספריית התמונות
      </Button>

      <ImageLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
        multiple={true}
        uploadBucket="product-images"
        uploadPath={productId}
      />
    </div>
  );
};

export default ProductImageManager;
