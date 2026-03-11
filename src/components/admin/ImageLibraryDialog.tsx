import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, Upload, Check, Loader2, X, Image as ImageIcon } from "lucide-react";
import { useStorageLibrary } from "@/hooks/useStorageLibrary";
import {
  STORAGE_BUCKETS,
  uploadToStorage,
  type BucketName,
  type StorageFile,
} from "@/lib/storage";

// ── Props ─────────────────────────────────────────
interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  bucketFilter?: BucketName[];
  uploadBucket?: BucketName;
  uploadPath?: string;
  title?: string;
}

// ── Component ─────────────────────────────────────
const ImageLibraryDialog = ({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  bucketFilter,
  uploadBucket = "product-images",
  uploadPath = "library",
  title = "ספריית תמונות",
}: ImageLibraryDialogProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("library");
  const [search, setSearch] = useState("");
  const [activeBuckets, setActiveBuckets] = useState<Set<BucketName>>(
    new Set(bucketFilter ?? STORAGE_BUCKETS.map((b) => b.name)),
  );
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const { data: allFiles, isLoading } = useStorageLibrary({
    enabled: open,
  });

  // ── Filtering ───────────────────────────────────
  const filtered = (allFiles ?? []).filter((f) => {
    if (!activeBuckets.has(f.bucket)) return false;
    if (
      search &&
      !f.name.toLowerCase().includes(search.toLowerCase()) &&
      !f.fullPath.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // ── Selection ───────────────────────────────────
  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      if (multiple) {
        const next = new Set(prev);
        next.has(url) ? next.delete(url) : next.add(url);
        return next;
      }
      // Single select — toggle or replace
      return prev.has(url) ? new Set() : new Set([url]);
    });
  };

  const confirm = () => {
    if (selectedUrls.size === 0) return;
    onSelect(Array.from(selectedUrls));
    setSelectedUrls(new Set());
    setSearch("");
    onOpenChange(false);
  };

  // ── Bucket filter toggle ────────────────────────
  const toggleBucket = (b: BucketName) => {
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(b) && next.size > 1) {
        next.delete(b);
      } else {
        next.add(b);
      }
      return next;
    });
  };

  // ── Quick upload ────────────────────────────────
  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;
      setUploading(true);
      let done = 0;
      for (const file of arr) {
        try {
          const ext = file.name.split(".").pop();
          const path = `${uploadPath}/${Date.now()}-${done}.${ext}`;
          await uploadToStorage(uploadBucket, path, file);
          done++;
        } catch {
          // continue with next file
        }
      }
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["storage-library"] });
      toast.success(`הועלו ${done} תמונות`);
      setActiveTab("library");
    },
    [uploadBucket, uploadPath, queryClient],
  );

  // ── Visible bucket list ─────────────────────────
  const visibleBuckets = bucketFilter
    ? STORAGE_BUCKETS.filter((b) => bucketFilter.includes(b.name))
    : STORAGE_BUCKETS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-6 mt-3 w-fit">
            <TabsTrigger value="library">ספרייה</TabsTrigger>
            <TabsTrigger value="upload">העלאה חדשה</TabsTrigger>
          </TabsList>

          {/* ── Library tab ───────────────────── */}
          <TabsContent value="library" className="flex flex-col flex-1 min-h-0 mt-0 px-6 py-3 gap-3">
            {/* Search & bucket filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש תמונה..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              {visibleBuckets.length > 1 &&
                visibleBuckets.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => toggleBucket(b.name)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      activeBuckets.has(b.name)
                        ? "bg-accent/20 border-accent text-accent-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
            </div>

            {/* Image grid */}
            <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">
                  {search ? "לא נמצאו תוצאות" : "אין תמונות בספרייה. העלה תמונות חדשות."}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pb-2">
                  {filtered.map((file) => {
                    const isSelected = selectedUrls.has(file.publicUrl);
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleUrl(file.publicUrl)}
                        className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-accent ring-2 ring-accent/30"
                            : "border-border hover:border-accent/40"
                        }`}
                      >
                        <img
                          src={file.publicUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                          <p className="text-[9px] text-white truncate">{file.name}</p>
                        </div>
                        {/* Bucket label */}
                        <span className="absolute top-1 left-1 text-[8px] bg-black/50 text-white px-1 py-0.5 rounded">
                          {STORAGE_BUCKETS.find((b) => b.name === file.bucket)?.label ?? file.bucket}
                        </span>
                        {/* Selection checkbox */}
                        <div
                          className={`absolute top-1 right-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-accent border-accent text-white"
                              : "border-white/80 bg-black/20"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border pt-3 pb-1">
              <span className="text-sm text-muted-foreground">
                {selectedUrls.size > 0
                  ? `${selectedUrls.size} תמונות נבחרו`
                  : `${filtered.length} תמונות`}
              </span>
              <Button variant="gold" size="sm" disabled={selectedUrls.size === 0} onClick={confirm}>
                <Check className="h-4 w-4 ml-1" />
                {selectedUrls.size > 0 ? `בחר (${selectedUrls.size})` : "בחר"}
              </Button>
            </div>
          </TabsContent>

          {/* ── Upload tab ────────────────────── */}
          <TabsContent value="upload" className="flex-1 px-6 py-3">
            <div
              onDrop={(e) => {
                e.preventDefault();
                handleUpload(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent transition-colors cursor-pointer"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/*";
                input.onchange = () => input.files && handleUpload(input.files);
                input.click();
              }}
            >
              {uploading ? (
                <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-muted-foreground font-body">
                {uploading ? "מעלה תמונות..." : "גרור תמונות לכאן או לחץ לבחירה"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, AVIF</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLibraryDialog;
