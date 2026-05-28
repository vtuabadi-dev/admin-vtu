import { createLocalAdapter } from "./local";
import { createS3Adapter, isS3Configured } from "./s3";
import type { StorageAdapter } from "./adapter";

export type { StorageAdapter } from "./adapter";

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;
  _adapter = isS3Configured() ? createS3Adapter() : createLocalAdapter();
  return _adapter;
}

// Export path helpers for convenience
export { dokumenPath, dokumenThumbPath, exportFilePath, backupPath, tempUploadPath, signaturePath } from "@/services/storage/paths";
