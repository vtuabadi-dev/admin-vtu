import { createLocalAdapter } from "./local";
import { createS3Adapter, isS3Configured } from "./s3";
import { createGoogleDriveAdapter, isGoogleDriveConfigured } from "./google-drive";
import type { StorageAdapter } from "./adapter";

export type { StorageAdapter } from "./adapter";

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  if (isGoogleDriveConfigured()) {
    _adapter = createGoogleDriveAdapter();
  } else if (isS3Configured()) {
    _adapter = createS3Adapter();
  } else {
    // Mode Transit Storage Sementara (Transit Vault)
    // Berfungsi sebagai transit folder sementara sampai credential Google Drive dihubungkan di Vercel env
    console.warn("[STORAGE] Google Drive belum dikonfigurasi. Menggunakan Mode Transit Storage Sementara.");
    _adapter = createLocalAdapter();
  }

  return _adapter;
}

// Export path helpers for convenience
export { dokumenPath, dokumenThumbPath, exportFilePath, backupPath, tempUploadPath, signaturePath, formulirPendaftaranPath } from "@/services/storage/paths";
