import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { getStorageAdapter } from "@/server/storage";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit
  const rlKey = rateLimitKey(request);
  const rl = checkRateLimit(rlKey, getRateLimitConfig("upload"));
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many upload requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let kodeRegistrasi = "";
    let fileBuffer: Buffer | null = null;
    let fileMime = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      kodeRegistrasi = (formData.get("kodeRegistrasi") as string) || "";
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, message: "File bukti transfer wajib diunggah" }, { status: 400 });
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileMime = file.type || "image/jpeg";
    } else {
      const body = await request.json();
      kodeRegistrasi = body.kodeRegistrasi || "";
      if (body.fileBase64) {
        const base64Data = body.fileBase64.replace(/^data:image\/\w+;base64,/, "");
        fileBuffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!kodeRegistrasi) {
      return NextResponse.json({ success: false, message: "Kode registrasi wajib diisi" }, { status: 400 });
    }

    // Find registration record
    const reg = await prisma.registrationRequest.findUnique({
      where: { kodeRegistrasi },
    });

    if (!reg) {
      return NextResponse.json({ success: false, message: "Kode registrasi tidak ditemukan" }, { status: 404 });
    }

    let buktiUrl = "";
    if (fileBuffer && fileBuffer.length > 0) {
      const storage = getStorageAdapter();
      const storagePath = `BUKTI_TRANSFER/${kodeRegistrasi}_${Date.now()}.jpg`;
      try {
        const { getOrCreateFolder, isGoogleDriveConfigured } = await import("@/server/storage/google-drive");
        let targetFolderId: string | undefined = undefined;
        if (isGoogleDriveConfigured()) {
          targetFolderId = await getOrCreateFolder("PEMBAYARAN");
        }
        await storage.upload(storagePath, fileBuffer, fileMime, targetFolderId);
        buktiUrl = await storage.getUrl(storagePath);
      } catch (uploadErr) {
        console.warn("[payment-proof] Storage upload warning, saving to local vault:", uploadErr);
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        await localVault.upload(storagePath, fileBuffer, fileMime);
        buktiUrl = await localVault.getUrl(storagePath);
      }
    }

    // Update Registration Request status and catatanAdmin
    const updatedNotes = [
      reg.catatanAdmin || "",
      `[Bukti DP Uploaded at ${new Date().toISOString()}]: ${buktiUrl || "File received"}`,
    ].filter(Boolean).join("\n");

    await prisma.registrationRequest.update({
      where: { kodeRegistrasi },
      data: {
        catatanAdmin: updatedNotes,
        status: "PENDING_REVIEW",
      },
    });

    // ── Generate PDF Formulir Pendaftaran ──────────────────────────────────────
    let pdfBuf: Buffer | null = null;
    const pdfFileName = `${kodeRegistrasi}_${reg.namaPerwakilan.replace(/[^A-Z0-9]/gi, "_")}.pdf`;
    try {
      const { generateRegistrationPdf } = await import("@/server/services/registration-pdf.service");
      const { registrationRepo } = await import("@/server/repositories");
      const fullReg = await registrationRepo.findByKode(kodeRegistrasi);
      if (fullReg) {
        pdfBuf = await generateRegistrationPdf({
          registration: fullReg,
          packageInfo: null,
          termsVersion: "1.0",
          termsAcceptedAt: fullReg.termsAcceptedAt ?? fullReg.createdAt,
        });
        console.log(`[payment-proof] PDF formulir berhasil digenerate: ${pdfFileName}, size: ${pdfBuf.length} bytes`);
      } else {
        console.warn(`[payment-proof] Registration ${kodeRegistrasi} tidak ditemukan di repo — skip PDF generation`);
      }
    } catch (pdfErr) {
      console.warn("[payment-proof] PDF generation warning:", pdfErr);
    }

    // ── Simpan PDF ke Google Drive (Folder: FORMULIR PENDAFTARAN) ─────────────
    if (pdfBuf) {
      try {
        const { isGoogleDriveConfigured, getOrCreateFolder } = await import("@/server/storage/google-drive");
        if (isGoogleDriveConfigured()) {
          const driveStorage = getStorageAdapter();
          const formulirFolderId = await getOrCreateFolder("FORMULIR PENDAFTARAN");
          await driveStorage.upload(pdfFileName, pdfBuf, "application/pdf", formulirFolderId);
          console.log(`[payment-proof] PDF formulir berhasil disimpan ke Google Drive folder FORMULIR PENDAFTARAN: ${pdfFileName}`);
        } else {
          console.warn("[payment-proof] Google Drive tidak dikonfigurasi — skip Drive upload");
        }
      } catch (driveErr) {
        console.warn("[payment-proof] Gagal menyimpan PDF ke Google Drive (non-blocking):", driveErr);
      }
    }

    // ── Send email notification ──────────────────────────────────────────────────
    try {
      if (reg.emailPerwakilan) {
        const { getNotificationProvider } = await import("@/server/services/notify");
        const notifier = getNotificationProvider();
        await notifier.send({
          channel: "email",
          recipient: reg.emailPerwakilan,
          subject: `Tanda Terima Upload Bukti Transfer DP — ${kodeRegistrasi} (${reg.namaPerwakilan})`,
          body: [
            `Yth. ${reg.namaPerwakilan},`,
            "",
            `Assalamu'alaikum Warahmatullahi Wabarakatuh.`,
            "",
            `Bukti pembayaran Down Payment (DP) untuk pendaftaran rombongan Anda telah BERHASIL kami terima.`,
            "",
            `  ✅ Kode Registrasi : ${kodeRegistrasi}`,
            `  👤 Nama PIC         : ${reg.namaPerwakilan}`,
            `  👥 Jumlah Jamaah    : ${reg.paxCount} PAX`,
            `  📅 Tanggal Unggah   : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
            "",
            `📎 Formulir Pendaftaran Resmi terlampir dalam email ini (file PDF).`,
            "",
            `⏳ Status Saat Ini: MEMENUHI VERIFIKASI KEUANGAN (1x24 Jam)`,
            `   Tim Keuangan VTU ABADI Travel akan melakukan pencocokan mutasi bank. Setelah disetujui, kwitansi resmi akan dikirimkan ke email ini.`,
            "",
            `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
            `PT VTU ABADI TRAVEL`,
          ].join("\n"),
          attachments: pdfBuf
            ? [
                {
                  filename: pdfFileName,
                  content: pdfBuf,
                  contentType: "application/pdf",
                },
              ]
            : undefined,
        });
      }
    } catch (notifyErr) {
      console.warn("[payment-proof] Notification dispatch warning:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        kodeRegistrasi,
        buktiUrl,
        message: "Bukti transfer DP berhasil diterima. Tim keuangan akan memverifikasi dalam 1x24 jam.",
      },
    });
  } catch (error) {
    console.error("[payment-proof] Error handling payment proof:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
