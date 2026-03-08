import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ProductImageManagerProps {
  productId: string;
}

const ProductImageManager = ({ productId }: ProductImageManagerProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const currentCount = images?.length || 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
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
      toast.success(`${files.length} תמונות הועלו בהצלחה`);
    } catch (err: any) {
      toast.error(`שגיאה בהעלאה: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [productId, images, queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

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

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*,video/mp4";
          input.onchange = () => handleUpload(input.files);
          input.click();
        }}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading ? "מעלה..." : "גרור תמונות לכאן או לחץ להעלאה"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, MP4</p>
      </div>
    </div>
  );
};

export default ProductImageManager;
