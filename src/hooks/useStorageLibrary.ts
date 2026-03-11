import { useQuery } from "@tanstack/react-query";
import { listAllBucketFiles, type BucketName, type StorageFile } from "@/lib/storage";

interface UseStorageLibraryOptions {
  buckets?: BucketName[];
  enabled?: boolean;
}

export function useStorageLibrary(options: UseStorageLibraryOptions = {}) {
  const { buckets, enabled = true } = options;

  return useQuery<StorageFile[]>({
    queryKey: ["storage-library", buckets ?? "all"],
    queryFn: () => listAllBucketFiles(buckets),
    enabled,
    staleTime: 30_000,
  });
}
