import { createLocalAdapter } from "./local";
import { createS3Adapter, isS3Configured } from "./s3";
import { createGoogleDriveAdapter, isGoogleDriveConfigured } from "./google-drive";
import type { StorageAdapter } from "./adapter";

export type { StorageAdapter } from "./adapter";

export function getStorageAdapter(): StorageAdapter {
  if (isGoogleDriveConfigured()) {
    return createGoogleDriveAdapter();
  }
  if (isS3Configured()) {
    return createS3Adapter();
  }
  console.warn("[STORAGE] Google Drive belum dikonfigurasi. Menggunakan Mode Transit Storage Sementara.");
  return createLocalAdapter();
}

// Export path helpers for convenience
export { dokumenPath, dokumenThumbPath, exportFilePath, backupPath, tempUploadPath, signaturePath, formulirPendaftaranPath } from "@/services/storage/paths";
