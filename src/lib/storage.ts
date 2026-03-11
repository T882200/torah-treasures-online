import { supabase } from "@/integrations/supabase/client";

// ── Bucket configuration ──────────────────────────
export const STORAGE_BUCKETS = [
  { name: "product-images" as const, label: "תמונות מוצרים" },
  { name: "banners" as const, label: "באנרים" },
  { name: "badges" as const, label: "תגיות" },
  { name: "category-images" as const, label: "קטגוריות" },
] as const;

export type BucketName = (typeof STORAGE_BUCKETS)[number]["name"];

export interface StorageFile {
  id: string;        // "bucket/fullPath" — unique key
  bucket: BucketName;
  fullPath: string;  // e.g. "bulk/1710000000-0.jpg"
  name: string;      // e.g. "1710000000-0.jpg"
  publicUrl: string;
  createdAt: string;
}

// ── Recursive listing of a single bucket ──────────
async function listBucketFilesRecursive(
  bucket: BucketName,
  path: string,
  accumulated: StorageFile[],
): Promise<StorageFile[]> {
  let offset = 0;
  const limit = 500;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || undefined, {
        limit,
        offset,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error || !data || data.length === 0) break;

    for (const item of data) {
      if (item.name === ".emptyFolderPlaceholder") continue;
      const fullPath = path ? `${path}/${item.name}` : item.name;

      if (item.metadata) {
        // It's a file
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(fullPath);

        accumulated.push({
          id: `${bucket}/${fullPath}`,
          bucket,
          fullPath,
          name: item.name,
          publicUrl,
          createdAt: item.created_at || "",
        });
      } else {
        // It's a directory — recurse
        await listBucketFilesRecursive(bucket, fullPath, accumulated);
      }
    }

    offset += data.length;
    if (data.length < limit) break;
  }

  return accumulated;
}

export async function listBucketFiles(bucket: BucketName): Promise<StorageFile[]> {
  return listBucketFilesRecursive(bucket, "", []);
}

// ── List across multiple buckets in parallel ──────
export async function listAllBucketFiles(
  buckets?: BucketName[],
): Promise<StorageFile[]> {
  const targets = buckets ?? STORAGE_BUCKETS.map((b) => b.name);
  const results = await Promise.all(targets.map((b) => listBucketFiles(b)));
  const merged = results.flat();
  merged.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return merged;
}

// ── Upload helper ─────────────────────────────────
export async function uploadToStorage(
  bucket: BucketName,
  path: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
