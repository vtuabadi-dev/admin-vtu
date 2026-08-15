import { NextResponse } from "next/server";
import { getStorageAdapter } from "@/server/storage";

export async function GET() {
  const results: string[] = [];

  try {
    // Step 1: Check Google Drive configuration
    results.push("=== STEP 1: Check Google Drive Config ===");
    const { isGoogleDriveConfigured, getOrCreateFolder } = await import("@/server/storage/google-drive");
    const configured = isGoogleDriveConfigured();
    results.push(`isGoogleDriveConfigured(): ${configured}`);
    results.push(`GOOGLE_DRIVE_FOLDER_ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID ? "SET (" + process.env.GOOGLE_DRIVE_FOLDER_ID.slice(0, 8) + "...)" : "NOT SET"}`);
    results.push(`GOOGLE_SERVICE_ACCOUNT_JSON: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? "SET (length=" + process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length + ")" : "NOT SET"}`);

    if (!configured) {
      results.push("❌ Google Drive NOT configured. Stopping.");
      return NextResponse.json({ success: false, results });
    }

    // Step 2: Try to create/find FORMULIR PENDAFTARAN folder
    results.push("\n=== STEP 2: getOrCreateFolder('FORMULIR PENDAFTARAN') ===");
    const formulirFolderId = await getOrCreateFolder("FORMULIR PENDAFTARAN");
    results.push(`✅ FORMULIR PENDAFTARAN folder ID: ${formulirFolderId}`);

    // Step 3: Create a tiny test PDF buffer
    results.push("\n=== STEP 3: Generate test PDF ===");
    const PDFDocument = (await import("pdfkit")).default;
    const pdfBuf = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.fontSize(16).text("TEST DRIVE UPLOAD", { align: "center" });
        doc.fontSize(12).text(`Timestamp: ${new Date().toISOString()}`);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
    results.push(`✅ Test PDF generated: ${pdfBuf.length} bytes`);

    // Step 4: Upload to Google Drive
    results.push("\n=== STEP 4: Upload to Google Drive ===");
    const storage = getStorageAdapter();
    const testFileName = `TEST_DRIVE_UPLOAD_${Date.now()}.pdf`;
    const fileId = await storage.upload(testFileName, pdfBuf, "application/pdf", formulirFolderId);
    results.push(`✅ BERHASIL! File uploaded to Drive. File ID: ${fileId}`);
    results.push(`✅ File name: ${testFileName}`);

    return NextResponse.json({ success: true, results, fileId });
  } catch (error: any) {
    results.push(`\n❌ ERROR: ${error.message}`);
    results.push(`Stack: ${error.stack?.slice(0, 500)}`);
    return NextResponse.json({ success: false, results, error: error.message }, { status: 500 });
  }
}
