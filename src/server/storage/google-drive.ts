import type { StorageAdapter } from "./adapter";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export function isGoogleDriveConfigured(): boolean {
  const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID;
  const hasOauth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
  return !!(hasFolderId && hasOauth);
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "[Google Drive OAuth Error] Environment variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REFRESH_TOKEN wajib dikonfigurasi di Vercel.\n" +
      "Cloud Vault secara eksklusif menggunakan OAuth 2.0 User identity untuk menyimpan berkas di Google Drive pribadi."
    );
  }

  try {
    const { OAuth2Client } = await import("google-auth-library");
    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const res = await oauth2Client.getAccessToken();
    if (!res.token) throw new Error("Google Drive OAuth2 client did not return an access token");
    return res.token;
  } catch (err: any) {
    console.error("[Google Drive OAuth Error: Invalid Grant / Token Revoked]", err?.message || err);
    throw new Error(
      `[Google Drive OAuth Authorization Failure] Gagal mendapatkan Access Token: ${err?.message || err}. ` +
      "Refresh Token kemungkinan telah direvoke atau invalid. Lakukan re-authorization di Google Cloud / OAuth Playground untuk memperbarui GOOGLE_REFRESH_TOKEN di Vercel Environment Variables."
    );
  }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Drive API error ${res.status}: ${text.slice(0, 500)}`);
  }
  return res;
}

export async function checkStorageQuotaDiagnostics(): Promise<{ totalBytes?: number; usedBytes?: number; userEmail?: string; error?: string }> {
  try {
    const res = await apiFetch(`${DRIVE_API}/about?fields=storageQuota,user`);
    const data = await res.json();
    return {
      totalBytes: parseInt(data.storageQuota?.limit || "0", 10),
      usedBytes: parseInt(data.storageQuota?.usage || "0", 10),
      userEmail: data.user?.emailAddress,
    };
  } catch (err: any) {
    return { error: err?.message || "Failed to fetch storage diagnostics" };
  }
}

export async function getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
  const rootId = parentId || process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const query = `'${rootId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`
  );
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createRes = await apiFetch(`${DRIVE_API}/files?supportsAllDrives=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    }),
  });
  const folder = await createRes.json();

  // Grant open/write access so users with folder link can view and click into the folder
  try {
    await apiFetch(`${DRIVE_API}/files/${folder.id}/permissions?supportsAllDrives=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "writer", type: "anyone" }),
    });
  } catch { /* non-blocking */ }

  return folder.id;
}

export interface DriveFolderRegistry {
  rootPackageFolderId: string;
  paspor: string;
  ktp: string;
  foto: string;
  pembayaran: string;
  tandaTangan: string;
  dokumenLain: string;
  manifest: string;
  export: string;
  formulirPendaftaran: string;
}

export async function createPackageFolderHierarchy(
  year: number,
  monthFolderName: string,
  packageFolderName: string
): Promise<DriveFolderRegistry> {
  if (!isGoogleDriveConfigured()) {
    return {
      rootPackageFolderId: "local-mock",
      paspor: "local-mock",
      ktp: "local-mock",
      foto: "local-mock",
      pembayaran: "local-mock",
      tandaTangan: "local-mock",
      dokumenLain: "local-mock",
      manifest: "local-mock",
      export: "local-mock",
      formulirPendaftaran: "local-mock",
    };
  }

  const rootIndukId = await getOrCreateFolder("KELENGKAPAN DATA JAMAAH", process.env.GOOGLE_DRIVE_FOLDER_ID);
  const yearId = await getOrCreateFolder(String(year), rootIndukId);
  const monthId = await getOrCreateFolder(monthFolderName, yearId);
  const packageFolderId = await getOrCreateFolder(packageFolderName, monthId);

  const paspor = await getOrCreateFolder("PASPOR", packageFolderId);
  const ktp = await getOrCreateFolder("KTP", packageFolderId);
  const foto = await getOrCreateFolder("FOTO", packageFolderId);
  const pembayaran = await getOrCreateFolder("PEMBAYARAN", packageFolderId);
  const tandaTangan = await getOrCreateFolder("TANDA TANGAN", packageFolderId);
  const dokumenLain = await getOrCreateFolder("DOKUMEN LAIN", packageFolderId);
  const manifest = await getOrCreateFolder("MANIFEST", packageFolderId);
  const exportFolder = await getOrCreateFolder("EXPORT", packageFolderId);
  const formulirPendaftaran = await getOrCreateFolder("FORMULIR PENDAFTARAN", packageFolderId);

  return {
    rootPackageFolderId: packageFolderId,
    paspor,
    ktp,
    foto,
    pembayaran,
    tandaTangan,
    dokumenLain,
    manifest,
    export: exportFolder,
    formulirPendaftaran,
  };
}

export async function getOrCreateFormulirPendaftaranDriveFolder(packageFolderId?: string): Promise<string | undefined> {
  if (!isGoogleDriveConfigured()) return undefined;
  try {
    const parentId = packageFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!parentId) return undefined;
    const folderId = await getOrCreateFolder("FORMULIR PENDAFTARAN", parentId);
    return folderId;
  } catch (err) {
    console.error("[Google Drive] Failed to get or create FORMULIR PENDAFTARAN folder:", err);
    return undefined;
  }
}

export async function createHotelVideoFolderHierarchy(
  cityName: string,
  hotelName: string
): Promise<string> {
  if (!isGoogleDriveConfigured()) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID || "local-mock";
  }

  const videoHotelFolderId = await getOrCreateFolder("VIDEO HOTEL");
  const normalizedCity = cityName.toUpperCase().includes("MADINAH") ? "MADINAH" : "MAKKAH";
  const cityFolderId = await getOrCreateFolder(normalizedCity, videoHotelFolderId);
  const hotelFolderId = await getOrCreateFolder(hotelName.trim(), cityFolderId);

  return hotelFolderId;
}

export function createGoogleDriveAdapter(): StorageAdapter {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  if (!/^[a-zA-Z0-9_-]{15,60}$/.test(folderId)) {
    throw new Error(
      `[Google Drive] GOOGLE_DRIVE_FOLDER_ID format tidak valid: "${folderId}". ` +
      "Folder ID dapat ditemukan di URL: https://drive.google.com/drive/folders/<FOLDER_ID>"
    );
  }

  function getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  return {
    async upload(path: string, buffer: Buffer, contentType: string, targetFolderId?: string): Promise<string> {
      const fileName = getFileName(path);
      const parentFolderId = targetFolderId || folderId;

      // Step 1: Create file metadata entry in the target parent folder
      const metaRes = await apiFetch(`${DRIVE_API}/files?supportsAllDrives=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          mimeType: contentType,
          parents: [parentFolderId],
        }),
      });
      const metaData = await metaRes.json();
      const fileId = metaData.id;

      // Step 2: Upload binary content to the created file entry via simple media upload
      const token = await getAccessToken();
      const uploadRes = await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media&supportsAllDrives=true`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
          "Content-Length": String(buffer.length),
        },
        body: new Uint8Array(buffer),
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => "");
        console.error(`[Google Drive Media Upload Fail] HTTP ${uploadRes.status} for file "${fileName}" (ID: ${fileId}):`, text);
        if (text.includes("storage quota") || text.includes("Service Accounts do not have storage quota")) {
          throw new Error(
            "[Google Drive 403 Storage Quota Exceeded]\n" +
            "Google Service Account tidak memiliki storage quota pribadi untuk upload file ke Personal Google Drive."
          );
        }
        throw new Error(`[Google Drive Upload] Media upload failed HTTP ${uploadRes.status}: ${text.slice(0, 500)}`);
      }

      // Step 3: Post-upload byte verification — assert size > 0 bytes
      const checkRes = await apiFetch(`${DRIVE_API}/files/${fileId}?fields=id,name,size&supportsAllDrives=true`);
      const fileMeta = await checkRes.json();
      const byteSize = parseInt(fileMeta.size || "0", 10);

      if (byteSize === 0) {
        throw new Error(
          `[Cloud Vault Storage Verification FAILED] File "${fileName}" (ID: ${fileId}) was saved as 0 bytes in Google Drive. Media upload was incomplete.`
        );
      }

      // Grant view/edit permission on the file entry
      try {
        await apiFetch(`${DRIVE_API}/files/${fileId}/permissions?supportsAllDrives=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "writer", type: "anyone" }),
        });
      } catch { /* non-blocking */ }

      console.log(`[Google Drive Upload Success] File "${fileName}" (ID: ${fileId}, Size: ${byteSize} bytes) successfully saved to folder ID "${parentFolderId}"`);
      return fileId;
    },

    async download(fileId: string): Promise<Buffer> {
      const res = await apiFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },

    async delete(fileId: string): Promise<void> {
      await apiFetch(`${DRIVE_API}/files/${fileId}`, { method: "DELETE" });
    },

    async exists(fileId: string): Promise<boolean> {
      try {
        await apiFetch(`${DRIVE_API}/files/${fileId}?fields=id`);
        return true;
      } catch {
        return false;
      }
    },

    async getUrl(fileId: string): Promise<string> {
      return `/api/storage/download?id=${fileId}`;
    },

    async list(prefix: string): Promise<{ path: string; size: number; modifiedAt: Date }[]> {
      const prefixFilter = getFileName(prefix);
      const query = `'${folderId}' in parents and name contains '${prefixFilter}' and trashed=false`;
      const res = await apiFetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime)`);
      const data = await res.json();
      return (data.files || []).map((f: { id: string; name: string; size?: string; modifiedTime?: string }) => ({
        path: f.id,
        size: parseInt(f.size || "0", 10),
        modifiedAt: f.modifiedTime ? new Date(f.modifiedTime) : new Date(),
      }));
    },
  };
}

export async function renameDriveFile(fileId: string, newName: string): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_API}/files/${fileId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });
  return res.ok;
}
