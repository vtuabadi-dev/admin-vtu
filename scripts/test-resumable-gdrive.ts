import { generateRegistrationPdf } from "../src/server/services/registration-pdf.service";

const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_METADATA = "https://www.googleapis.com/drive/v3";

async function getAccessToken(): Promise<string> {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const creds = JSON.parse(jsonRaw);
  const { JWT } = await import("google-auth-library");
  const jwt = new JWT({ email: creds.client_email, key: creds.private_key, scopes: ["https://www.googleapis.com/auth/drive"] });
  const tokens = await jwt.getAccessToken();
  return tokens.token!;
}

async function uploadResumable(fileName: string, parentFolderId: string, buffer: Buffer, contentType: string): Promise<string> {
  const token = await getAccessToken();

  // Step 1: Initiate Resumable Upload Session
  const initRes = await fetch(`${DRIVE_UPLOAD}/files?uploadType=resumable&supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": contentType,
      "X-Upload-Content-Length": buffer.length.toString(),
    },
    body: JSON.stringify({
      name: fileName,
      mimeType: contentType,
      parents: [parentFolderId],
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Resumable session init failed HTTP ${initRes.status}: ${errText}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Resumable upload URL missing from response headers");
  }

  // Step 2: Upload File Binary Payload
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
    },
    body: new Uint8Array(buffer),
  });

  const data = await uploadRes.json();
  if (!uploadRes.ok) {
    // Cleanup orphan 0-byte metadata file
    await fetch(`${DRIVE_METADATA}/files/${(data as any).error?.errors?.[0]?.fileId || ""}?supportsAllDrives=true`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await getAccessToken()}` },
    }).catch(() => {});
    throw new Error(`Resumable upload PUT failed HTTP ${uploadRes.status}: ${JSON.stringify(data)}`);
  }

  return data.id;
}

async function main() {
  console.log("Testing Resumable Upload to Google Drive...");

  const mockReg: any = {
    kodeRegistrasi: "GRP-2026-TEST003",
    namaPerwakilan: "ZAMRONI RESUMABLE TEST",
    nomorTelepon: "08123456789",
    emailPerwakilan: "zamroni.test@example.com",
    createdAt: new Date(),
    members: [
      { namaLengkap: "ZAMRONI TEST", jenisKelamin: "L", tempatLahir: "MALANG", tanggalLahir: "1992-08-12", hubungan: "Suami" },
    ],
  };

  const pdfBuffer = await generateRegistrationPdf({
    registration: mockReg,
    packageInfo: null,
    termsVersion: "1.0",
    termsAcceptedAt: new Date(),
  });

  console.log("🎉 PDF generated! Bytes:", pdfBuffer.length);

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1psSUE3ac8Glel1NYvnDomiTRTNQG6wm1";
  console.log("📁 Target Folder ID:", folderId);

  const fileId = await uploadResumable("GRP-2026-TEST003_ZAMRONI_TEST.pdf", folderId, pdfBuffer, "application/pdf");
  console.log("🚀 RESUMABLE PDF UPLOADED TO GOOGLE DRIVE SUCCESSFULLY! File ID:", fileId);
}

main().catch(console.error);
