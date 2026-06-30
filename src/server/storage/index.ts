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
  } else if (process.env.NODE_ENV === "production") {
    // Production: NO silent fallback to local storage.
    // Local storage is ephemeral on Vercel — files disappear on cold start.
    throw new Error(
      "[STORAGE] Production memerlukan Google Drive atau S3.\n" +
      "Google Drive (recommended):\n" +
      "  - GOOGLE_DRIVE_FOLDER_ID=<folder-id>\n" +
      "  - GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>\n" +
      "S3 (alternative):\n" +
      "  - AWS_REGION=<region>\n" +
      "  - S3_BUCKET=<bucket>\n" +
      "  - AWS_ACCESS_KEY_ID=<key>\n" +
      "  - AWS_SECRET_ACCESS_KEY=<secret>\n" +
      "Local storage hanya untuk development (NODE_ENV !== 'production')."
    );
  } else {
    _adapter = createLocalAdapter();
  }

  return _adapter;
}

// Export path helpers for convenience
export { dokumenPath, dokumenThumbPath, exportFilePath, backupPath, tempUploadPath, signaturePath } from "@/services/storage/paths";
