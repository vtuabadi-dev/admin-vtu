import type { StorageAdapter } from "./adapter";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export function isGoogleDriveConfigured(): boolean {
  const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID;
  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasEmailKey = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  return !!(hasFolderId && (hasJson || hasEmailKey));
}

async function getAccessToken(): Promise<string> {
  const { JWT } = await import("google-auth-library");
  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  let jwt: InstanceType<typeof JWT>;

  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonRaw) {
    let creds: { client_email?: string; private_key?: string };
    try {
      creds = JSON.parse(jsonRaw);
    } catch {
      throw new Error(
        "[Google Drive] GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid. " +
        "Pastikan seluruh JSON service account di-paste dengan benar (satu baris atau multi-baris)."
      );
    }
    if (!creds.client_email || !creds.private_key) {
      throw new Error(
        "[Google Drive] GOOGLE_SERVICE_ACCOUNT_JSON tidak mengandung client_email atau private_key. " +
        "Pastikan JSON key berasal dari Google Cloud Console → Service Accounts → Keys."
      );
    }
    jwt = new JWT({ email: creds.client_email, key: creds.private_key, scopes });
  } else {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !key) {
      throw new Error(
        "[Google Drive] Google Drive dikonfigurasi tetapi credential tidak lengkap.\n" +
        "Gunakan salah satu:\n" +
        "  A) GOOGLE_SERVICE_ACCOUNT_JSON=<paste full JSON>\n" +
        "  B) GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY"
      );
    }
    jwt = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes,
    });
  }

  const tokens = await jwt.getAccessToken();
  if (!tokens.token) throw new Error("Failed to obtain Google Drive access token");
  return tokens.token;
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

export function createGoogleDriveAdapter(): StorageAdapter {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  // Validate folder ID format (Google Drive folder IDs are alphanumeric strings, typically 25-45 chars)
  if (!/^[a-zA-Z0-9_-]{15,60}$/.test(folderId)) {
    throw new Error(
      `[Google Drive] GOOGLE_DRIVE_FOLDER_ID format tidak valid: "${folderId}". ` +
      "Folder ID dapat ditemukan di URL: https://drive.google.com/drive/folders/<FOLDER_ID>"
    );
  }

  function getFileName(path: string): string {
    return path.replace(/[/\\]/g, "_");
  }

  return {
    async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
      const fileName = getFileName(path);

      // Step 1: Create file metadata
      const metaRes = await apiFetch(`${DRIVE_API}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      });
      const { id: fileId } = await metaRes.json();

      // Step 2: Upload content via simple upload
      await apiFetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { "Content-Type": contentType },
        body: new Uint8Array(buffer),
      });

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
