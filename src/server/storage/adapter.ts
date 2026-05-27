export interface StorageAdapter {
  /** Upload file buffer ke path, return URL atau path yang bisa diakses */
  upload(path: string, buffer: Buffer, contentType: string): Promise<string>;

  /** Download file dari path, return buffer */
  download(path: string): Promise<Buffer>;

  /** Hapus file */
  delete(path: string): Promise<void>;

  /** Cek apakah file exists */
  exists(path: string): Promise<boolean>;

  /** Dapatkan public URL (jika CDN/public bucket), atau local path */
  getUrl(path: string): Promise<string>;

  /** List file dalam direktori */
  list(prefix: string): Promise<{ path: string; size: number; modifiedAt: Date }[]>;
}
