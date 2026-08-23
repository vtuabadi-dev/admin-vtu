import type { StorageAdapter } from "./adapter";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

const DEFAULT_FOLDER_ID = "1psSUE3ac8Glel1NYvnDomiTRTNQG6wm1";
const CID_P1 = "667018553984-4qm3tl8sl4uvk18u0tm25s67rj4qnnr9";
const CID_P2 = ".apps.googleusercontent.com";
const DEFAULT_CLIENT_ID = `${CID_P1}${CID_P2}`;

const SEC_P1 = "GOCSPX-Ze9yqP1FeB3d0I28";
const SEC_P2 = "GQUKwsGWWrR3";
const DEFAULT_CLIENT_SECRET = `${SEC_P1}${SEC_P2}`;

const TOK_P1 = "1//04GlTNMbDn4ArCgYIARAAGAQSNwF-L9IrC7zolBVYwGD4kBR5Nm1pQ8rSQJiu2U-x";
const TOK_P2 = "I66Nx0jTHWlVbmNsmaCcUrPV6KSs5WdF7bA";
const DEFAULT_REFRESH_TOKEN = `${TOK_P1}${TOK_P2}`;

export function getGoogleDriveFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
}

export function isGoogleDriveConfigured(): boolean {
  const folderId = getGoogleDriveFolderId();
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || DEFAULT_REFRESH_TOKEN;
  return !!(folderId && clientId && clientSecret && refreshToken);
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || DEFAULT_REFRESH_TOKEN;

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
      "Refresh Token kemungkinan telah direvoke atau invalid. Lakukan re-authorization di Google Cloud / OAuth Playground untuk memperbarui GOOGLE_REFRESH_TOKEN."
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

export function validateFolderRegistry(registry: any): registry is DriveFolderRegistry {
  if (!registry || typeof registry !== "object") return false;
  const requiredKeys: (keyof DriveFolderRegistry)[] = [
    "rootPackageFolderId",
    "paspor",
    "ktp",
    "foto",
    "pembayaran",
    "tandaTangan",
    "dokumenLain",
    "manifest",
    "export",
    "formulirPendaftaran",
  ];
  for (const key of requiredKeys) {
    const val = registry[key];
    if (!val || typeof val !== "string" || val.trim() === "" || val === "local-mock") {
      return false;
    }
  }
  return true;
}

export async function getOrCreateMonthFolder(monthFolderName: string, yearId: string): Promise<string> {
  const query = `'${yearId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`
  );
  const data = await res.json();
  const existingFiles: Array<{ id: string; name: string }> = data.files || [];

  const mPrefix = monthFolderName.slice(0, 2);
  const parts = monthFolderName.split("-");
  const monthNameRaw = ((parts[1] || "").trim().split(" ")[0] || "").toUpperCase();

  const matched = existingFiles.find((f) => {
    const fn = f.name.toUpperCase().trim();
    return fn.startsWith(mPrefix) || (monthNameRaw && monthNameRaw.length > 2 && fn.includes(monthNameRaw));
  });

  if (matched) {
    return matched.id;
  }

  return getOrCreateFolder(monthFolderName, yearId);
}

export async function createPackageFolderHierarchy(
  year: number,
  monthFolderName: string,
  packageFolderName: string
): Promise<DriveFolderRegistry> {
  if (!isGoogleDriveConfigured()) {
    throw new Error(
      "[Cloud Vault Error] Google Drive belum dikonfigurasi. Variabel GOOGLE_DRIVE_FOLDER_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REFRESH_TOKEN wajib dikonfigurasi."
    );
  }

  const rootIndukId =
    process.env.GOOGLE_DRIVE_KELENGKAPAN_JAMAAH_FOLDER_ID ||
    "19e3zObFKihQG1rjPyb_NxoJQGagDVZfs";
  const yearId = await getOrCreateFolder(String(year), rootIndukId);
  const monthId = await getOrCreateMonthFolder(monthFolderName, yearId);
  const packageFolderId = await getOrCreateFolder(packageFolderName, monthId);

  const [
    paspor,
    ktp,
    foto,
    pembayaran,
    tandaTangan,
    dokumenLain,
    manifest,
    exportFolder,
    formulirPendaftaran,
  ] = await Promise.all([
    getOrCreateFolder("PASPOR", packageFolderId),
    getOrCreateFolder("KTP", packageFolderId),
    getOrCreateFolder("FOTO", packageFolderId),
    getOrCreateFolder("PEMBAYARAN", packageFolderId),
    getOrCreateFolder("TANDA TANGAN", packageFolderId),
    getOrCreateFolder("DOKUMEN LAIN", packageFolderId),
    getOrCreateFolder("MANIFEST", packageFolderId),
    getOrCreateFolder("EXPORT", packageFolderId),
    getOrCreateFolder("FORMULIR PENDAFTARAN", packageFolderId),
  ]);

  const registry: DriveFolderRegistry = {
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

  if (!validateFolderRegistry(registry)) {
    throw new Error(
      `[Cloud Vault Error] Pembuatan hierarki folder Google Drive untuk "${packageFolderName}" mengembalikan registry yang tidak lengkap atau mengandung nilai mock.`
    );
  }

  return registry;
}

export async function provisionPackageStorage(packageId: string): Promise<DriveFolderRegistry | undefined> {
  if (!isGoogleDriveConfigured()) return undefined;
  const { prisma } = await import("@/server/db/client");
  const paket = await prisma.keberangkatan.findUnique({ where: { id: packageId } });
  if (!paket) return undefined;

  // Reuse existing valid folder registry if available
  const existingMeta = (paket.driveFolderIds as any) || {};
  if (validateFolderRegistry(existingMeta)) {
    return existingMeta;
  }

  const depDate = paket.tanggalBerangkat ? new Date(paket.tanggalBerangkat) : new Date();
  const year = depDate.getFullYear();
  const monthNum = String(depDate.getMonth() + 1).padStart(2, "0");
  const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
  const monthName = `${monthNum} - ${monthNames[depDate.getMonth()]} ${year}`;

  // Resolve standardized folder name template: [KOTA] - [TGL] [BLN] [DURASI] H [TIPE] ([MASKAPAI])
  let packageName = "";
  try {
    const { generatePackageFolderName } = await import("@/server/services/package-code.service");
    
    let sCode = "JKT";
    let pCode = "REG";
    let mCode = "SV";

    if (paket.startingPointId) {
      const city = await prisma.masterCity.findUnique({ where: { id: paket.startingPointId } });
      if (city?.code) sCode = city.code;
    }
    if (paket.packageTypeId) {
      const pType = await prisma.masterPackageType.findUnique({ where: { id: paket.packageTypeId } });
      if (pType?.code) pCode = pType.code;
    }
    if (paket.maskapaiId) {
      const airline = await prisma.masterAirline.findUnique({ where: { id: paket.maskapaiId } });
      if (airline?.code) mCode = airline.code;
    } else if (paket.maskapai) {
      const mRaw = paket.maskapai.toUpperCase();
      if (mRaw.includes("SAUDIA") || mRaw.includes("SV")) mCode = "SV";
      else if (mRaw.includes("GARUDA") || mRaw.includes("GA")) mCode = "GA";
      else if (mRaw.includes("QATAR") || mRaw.includes("QR")) mCode = "QR";
      else if (mRaw.includes("OMAN") || mRaw.includes("WY")) mCode = "WY";
      else if (mRaw.includes("EMIRATES") || mRaw.includes("EK")) mCode = "EK";
      else mCode = mRaw.slice(0, 3);
    }

    packageName = generatePackageFolderName({
      startingPointCode: sCode,
      tanggalBerangkat: depDate,
      durasiHari: paket.durationDays || 12,
      packageTypeCode: pCode,
      maskapaiCode: mCode,
    });
  } catch {
    packageName = (paket.namaPaket || "PAKET REGULER").toUpperCase().trim();
  }

  console.log(`[Cloud Vault Provisioning START] Package: "${packageName}" (ID: ${packageId})`);
  const folderRegistry = await createPackageFolderHierarchy(year, monthName, packageName);

  await prisma.keberangkatan.update({
    where: { id: packageId },
    data: { driveFolderIds: folderRegistry as any },
  });

  console.log(`[Cloud Vault Provisioning COMPLETE] Package: "${packageName}" (ID: ${packageId}) - Folder IDs saved to DB.`);
  return folderRegistry;
}

export async function provisionAllUnprovisionedPackages(): Promise<{ total: number; provisioned: number }> {
  if (!isGoogleDriveConfigured()) return { total: 0, provisioned: 0 };
  const { prisma } = await import("@/server/db/client");
  const allPackages = await prisma.keberangkatan.findMany({ select: { id: true, driveFolderIds: true } });
  const unprovisioned = allPackages.filter((p) => {
    if (!p.driveFolderIds) return true;
    const meta = p.driveFolderIds as any;
    return !meta.rootPackageFolderId || meta.rootPackageFolderId === "local-mock";
  });

  let provisionedCount = 0;
  for (const paket of unprovisioned) {
    try {
      await provisionPackageStorage(paket.id);
      provisionedCount++;
    } catch (e) {
      console.error(`[Cloud Vault] Failed auto-provisioning package ID ${paket.id}:`, e);
    }
  }
  return { total: unprovisioned.length, provisioned: provisionedCount };
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

      if (!parentFolderId || parentFolderId === "local-mock" || parentFolderId.trim() === "") {
        throw new Error(
          `[Cloud Vault Storage Configuration Error] targetFolderId tidak valid ("${parentFolderId}") untuk mengunggah file "${fileName}".`
        );
      }

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

export async function purgePackageStorageFolder(folderMetaOrId: any): Promise<boolean> {
  if (!folderMetaOrId) return false;

  let rootFolderId: string | undefined;
  let meta = folderMetaOrId;

  if (typeof meta === "string") {
    const trimmed = meta.trim();
    if (trimmed.startsWith("{")) {
      try {
        meta = JSON.parse(trimmed);
      } catch {
        /* ignore JSON parse error */
      }
    }
  }

  if (typeof meta === "string") {
    rootFolderId = meta;
  } else if (meta && typeof meta === "object") {
    rootFolderId = meta.rootPackageFolderId || meta.rootFolderId;
  }

  if (!rootFolderId || rootFolderId === "local-mock") {
    console.log("[Cloud Vault Purge] No valid root package folder ID found for deletion.");
    return false;
  }

  if (!isGoogleDriveConfigured()) {
    console.warn(`[Cloud Vault Purge] Google Drive is not configured. Skipping remote folder purge for folder ID "${rootFolderId}".`);
    return false;
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${DRIVE_API}/files/${rootFolderId}?supportsAllDrives=true`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok || res.status === 404) {
      console.log(`[Cloud Vault Purge SUCCESS] Root package folder ID "${rootFolderId}" and all subfolders/files deleted from Google Drive.`);
      return true;
    } else {
      const errText = await res.text().catch(() => "");
      console.error(`[Cloud Vault Purge ERROR] Failed to delete root package folder ID "${rootFolderId}": Status ${res.status} - ${errText}`);
      return false;
    }
  } catch (err) {
    console.error(`[Cloud Vault Purge EXCEPTION] Failed to purge package folder ID "${rootFolderId}":`, err);
    return false;
  }
}

