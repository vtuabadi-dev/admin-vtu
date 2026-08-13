import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registrationRepo } from "@/server/repositories";
import { notificationRepo } from "@/server/repositories";
import { auditRepo } from "@/server/repositories";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";
import { getStorageAdapter, signaturePath } from "@/server/storage";
import type { GroupRegistrationFormData } from "@/shared/types";

const MAX_PAX = 100;
const MIN_PAX = 1;

async function generateKodeRegistrasi(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await (await import("@/server/db/client")).prisma.registrationRequest.count();
  const next = (count + 1).toString().padStart(5, "0");
  return `GRP-${year}-${next}`;
}

export async function POST(request: NextRequest) {
  // Rate limit — public endpoint
  const rlKey = rateLimitKey(request);
  const rl = checkRateLimit(rlKey, getRateLimitConfig("api-write"));
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json() as GroupRegistrationFormData;

    // Validate required fields
    if (!body.namaPerwakilan || !body.nomorTelepon || !body.emailPerwakilan) {
      return NextResponse.json({ success: false, message: "Data perwakilan wajib diisi" }, { status: 400 });
    }

    if (!body.termsAccepted) {
      return NextResponse.json({ success: false, message: "Semua syarat & ketentuan harus disetujui" }, { status: 400 });
    }

    if (!body.paxCount || body.paxCount < MIN_PAX || body.paxCount > MAX_PAX) {
      return NextResponse.json({ success: false, message: `Jumlah PAX harus antara ${MIN_PAX}-${MAX_PAX}` }, { status: 400 });
    }

    if (!body.members || body.members.length !== body.paxCount) {
      return NextResponse.json({ success: false, message: "Jumlah anggota tidak sesuai dengan paxCount" }, { status: 400 });
    }

    if (!body.paketId) {
      return NextResponse.json({ success: false, message: "Paket keberangkatan wajib dipilih" }, { status: 400 });
    }

    if (!body.signaturePath) {
      return NextResponse.json({ success: false, message: "Tanda tangan wajib diunggah" }, { status: 400 });
    }

    // Validate package exists
    const { prisma } = await import("@/server/db/client");
    const paket = await prisma.keberangkatan.findUnique({ where: { id: body.paketId } });
    if (!paket) {
      return NextResponse.json({ success: false, message: "Paket keberangkatan tidak ditemukan" }, { status: 400 });
    }

    // Generate kode registrasi
    const kodeRegistrasi = await generateKodeRegistrasi();

    // Move signature from temp to final path
    let finalSignaturePath = body.signaturePath;
    try {
      if (body.signaturePath.includes("tmp_")) {
        const storage = getStorageAdapter();
        const newPath = signaturePath(kodeRegistrasi);
        const buffer = await storage.download(body.signaturePath);
        finalSignaturePath = await storage.upload(newPath, buffer, "image/jpeg");
        await storage.delete(body.signaturePath).catch(() => {});
      }
    } catch {
      // If storage move fails, keep the original path
    }

    // UPPERCASE all nama fields
    const namaPerwakilan = body.namaPerwakilan.toUpperCase().trim();
    const members = body.members.map((m, i) => ({
      namaLengkap: m.namaLengkap.toUpperCase().trim(),
      jenisKelamin: m.jenisKelamin,
      tanggalLahir: m.tanggalLahir || undefined,
      hubungan: m.hubungan ?? null,
      urutan: i + 1,
    }));

    // Create registration request as DRAFT with leadStatus = BARU
    const reg = await registrationRepo.create({
      kodeRegistrasi,
      namaPerwakilan,
      nomorTelepon: body.nomorTelepon.trim(),
      emailPerwakilan: body.emailPerwakilan.toLowerCase().trim(),
      paxCount: body.paxCount,
      paketId: body.paketId,
      roomUpgrade: body.roomUpgrade || undefined,
      hotelUpgrade: body.hotelUpgrade || undefined,
      signaturePath: finalSignaturePath,
      termsAccepted: body.termsAccepted,
      termsAcceptedAt: (body as any).termsAcceptedAt ? new Date((body as any).termsAcceptedAt) : new Date(),
      signedAt: (body as any).signedAt ? new Date((body as any).signedAt) : undefined,
      leadStatus: "BARU",
      status: "DRAFT",
      members: members.map((m) => ({
        ...m,
        hubungan: m.hubungan || undefined,
      })),
    });

    // Create audit entry
    try {
      await auditRepo.create({
        userId: "system",
        userName: "System (Public Registration)",
        role: "jamaah",
        module: "jamaah",
        action: "registration.submit",
        detail: `Registrasi baru diajukan: ${kodeRegistrasi} — ${namaPerwakilan} (${body.paxCount} PAX)`,
        entityId: reg.id,
        entityType: "RegistrationRequest",
      });
    } catch {
      // Non-critical
    }

    // ── Generate PDF & Save to Google Drive "FORMULIR PENDAFTARAN" ───
    let pdfPath = "";
    let pdfFilename = "";
    let pdfBuffer: Buffer | null = null;
    let driveFileId = "";
    try {
      const { generateRegistrationPdf } = await import("@/server/services/registration-pdf.service");
      pdfBuffer = await generateRegistrationPdf({
        registration: reg,
        packageInfo: (paket as any) ?? null,
        termsVersion: (body as any).termsVersion || "1.0",
        termsAcceptedAt: reg.termsAcceptedAt ?? reg.createdAt,
        signedAt: reg.signedAt,
      });

      // Filename format: [KODE_REGISTRASI]_[NAMA_PENDAFTAR].pdf
      const namaClean = namaPerwakilan.replace(/[^A-Z0-9]/gi, "_").replace(/_+/g, "_");
      pdfFilename = `${kodeRegistrasi}_${namaClean}.pdf`;
      pdfPath = `FORMULIR PENDAFTARAN/${pdfFilename}`;

      const storage = getStorageAdapter();

      // Resolve Google Drive "FORMULIR PENDAFTARAN" folder ID
      let targetDriveFolderId: string | undefined = undefined;
      try {
        const { getOrCreateFolder, isGoogleDriveConfigured } = await import("@/server/storage/google-drive");
        if (isGoogleDriveConfigured()) {
          targetDriveFolderId = await getOrCreateFolder("FORMULIR PENDAFTARAN");
        }
      } catch (err) {
        console.warn("[register] Google Drive folder resolution warning:", err);
      }

      // Upload PDF into Google Drive or fallback to local vault
      try {
        driveFileId = await storage.upload(pdfPath, pdfBuffer, "application/pdf", targetDriveFolderId);
      } catch (uploadErr: any) {
        console.warn("[register] Primary storage upload warning, saving to local vault:", uploadErr?.message || uploadErr);
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        driveFileId = await localVault.upload(pdfPath, pdfBuffer, "application/pdf");
      }
    } catch (err) {
      console.error("[register] PDF generation error:", err);
    }

    // ── Send confirmation email with attached PDF ────────────
    let emailStatus = "not_sent";
    try {
      const { getNotificationProvider } = await import("@/server/services/notify");
      const notifier = getNotificationProvider();
      const namaClean = namaPerwakilan.replace(/[^A-Z0-9]/gi, "_").replace(/_+/g, "_");
      await notifier.send({
        channel: "email",
        recipient: body.emailPerwakilan,
        subject: `Konfirmasi Registrasi Jamaah Umroh — ${kodeRegistrasi} (${namaPerwakilan})`,
        body: [
          `Yth. ${namaPerwakilan},`,
          "",
          `Terima kasih telah melakukan pendaftaran melalui portal registrasi VTU Travel.`,
          "",
          `Berikut ringkasan pendaftaran Anda:`,
          `  • No. Registrasi : ${kodeRegistrasi}`,
          `  • Nama PIC       : ${namaPerwakilan}`,
          `  • Paket Umroh    : ${paket?.namaPaket ?? "-"}`,
          `  • Jumlah Jamaah  : ${body.paxCount} PAX`,
          `  • Preferensi Kamar: ${(body.roomUpgrade || "quad").toUpperCase()}`,
          "",
          `Formulir & Surat Pernyataan Pendaftaran Anda terlampir dalam email ini dengan nama file:`,
          `📄 ${pdfFilename || `${kodeRegistrasi}_${namaClean}.pdf`}`,
          "",
          `Salinan dokumen ini juga telah berhasil tersimpan dalam folder arsip jamaah:`,
          `📂 FORMULIR PENDAFTARAN/${pdfFilename || `${kodeRegistrasi}_${namaClean}.pdf`}`,
          "",
          `Tim operasional kami akan menghubungi Anda melalui WhatsApp (${body.nomorTelepon}) dalam 1-2 hari kerja untuk verifikasi berkas selanjutnya.`,
          "",
          `Hormat kami,`,
          `Tim VTU Operasional`,
        ].join("\n"),
        attachments: pdfBuffer
          ? [
              {
                filename: pdfFilename || `${kodeRegistrasi}_${namaClean}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ]
          : undefined,
        metadata: {
          kodeRegistrasi,
          pdfPath,
          pdfFilename,
          driveFileId,
          registrationId: reg.id,
        },
      });
      emailStatus = "sent";
    } catch (err) {
      console.error("[register] Email notification failed:", err);
      // Non-blocking
    }

    // ── Audit: PDF + Email ──────────────────────────────────
    try {
      await auditRepo.create({
        userId: "system",
        userName: "System (Auto)",
        role: "jamaah",
        module: "jamaah",
        action: "registration.artifacts",
        detail: `PDF: ${pdfPath || "gagal"} (ID: ${driveFileId || "local"}) | Email: ${emailStatus} | Ke: ${body.emailPerwakilan}`,
        entityId: reg.id,
        entityType: "RegistrationRequest",
      });
    } catch { /* non-critical */ }

    // Notify admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["super_admin", "admin_operasional"] } },
        select: { id: true },
      });
      for (const admin of admins) {
        await notificationRepo.create({
          userId: admin.id,
          type: "info",
          category: "jamaah",
          title: "Registrasi Baru",
          message: `${namaPerwakilan} mengajukan registrasi grup ${kodeRegistrasi} (${body.paxCount} PAX) — Paket: ${paket.namaPaket}`,
          link: `/admin/pembayaran/registrasi-baru?id=${reg.id}`,
        });
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      kodeRegistrasi: reg.kodeRegistrasi,
      data: {
        kodeRegistrasi: reg.kodeRegistrasi,
        status: reg.status,
        message: "Registrasi berhasil diajukan. Tim kami akan meninjau permohonan Anda.",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Registration endpoint — use POST to submit group registration" });
}
