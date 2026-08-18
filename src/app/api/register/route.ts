import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registrationRepo } from "@/server/repositories";
import { notificationRepo } from "@/server/repositories";
import { auditRepo } from "@/server/repositories";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";
import { signaturePath } from "@/server/storage";
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
        const { getStorageAdapter } = await import("@/server/storage");
        const { isGoogleDriveConfigured, getOrCreateFolder } = await import("@/server/storage/google-drive");
        const storage = getStorageAdapter();
        const newPath = signaturePath(kodeRegistrasi);
        const buffer = await storage.download(body.signaturePath);

        let signatureFolderId: string | undefined = undefined;
        if (isGoogleDriveConfigured()) {
          try {
            const { createPackageFolderHierarchy } = await import("@/server/storage/google-drive");
            const depDate = paket?.tanggalBerangkat ? new Date(paket.tanggalBerangkat) : new Date();
            const year = depDate.getFullYear();
            const monthNum = String(depDate.getMonth() + 1).padStart(2, "0");
            const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
            const monthName = `${monthNum} - ${monthNames[depDate.getMonth()]} ${year}`;
            const packageName = (paket?.namaPaket || "PAKET REGULER").toUpperCase().trim();

            const folderRegistry = await createPackageFolderHierarchy(year, monthName, packageName);
            signatureFolderId = folderRegistry.tandaTangan;
          } catch (err) {
            console.warn("[register] Folder TANDA TANGAN error:", err);
            signatureFolderId = await getOrCreateFolder("TANDA TANGAN");
          }
        }

        finalSignaturePath = await storage.upload(newPath, buffer, "image/jpeg", signatureFolderId);
        await storage.delete(body.signaturePath).catch(() => {});
      }
    } catch (moveErr) {
      console.warn("[register] Signature move notice:", moveErr);
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

    // ── Generate PDF & Save to Local Server Vault ───────────
    // NOTE: Google Drive upload is disabled — Service Accounts have 0 storage quota (HTTP 403).
    // PDF is always saved to local server vault (/public/exports/formulir/) and attached to email.
    let pdfPath = "";
    let pdfFilename = "";
    let pdfBuffer: Buffer | null = null;
    let localFilePath = "";
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
      pdfPath = `formulir-pendaftaran/${pdfFilename}`;

      // Always save to local vault — reliable, no external dependency
      try {
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        localFilePath = await localVault.upload(pdfPath, pdfBuffer, "application/pdf");
        console.log("[register] PDF saved to local vault:", localFilePath);
      } catch (vaultErr: any) {
        console.warn("[register] Local vault save failed:", vaultErr?.message || vaultErr);
      }

      // Save to Google Drive if configured (OAuth2 User 200GB Storage)
      try {
        const { isGoogleDriveConfigured, getOrCreateFolder, createPackageFolderHierarchy } = await import("@/server/storage/google-drive");
        if (isGoogleDriveConfigured()) {
          const { getStorageAdapter } = await import("@/server/storage");
          const driveStorage = getStorageAdapter();

          let targetFolderId: string | undefined = undefined;
          if (paket) {
            try {
              const depDate = paket.tanggalBerangkat ? new Date(paket.tanggalBerangkat) : new Date();
              const year = depDate.getFullYear();
              const monthNum = String(depDate.getMonth() + 1).padStart(2, "0");
              const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
              const monthName = `${monthNum} - ${monthNames[depDate.getMonth()]} ${year}`;
              const packageName = (paket.namaPaket || "PAKET REGULER").toUpperCase().trim();

              const folderRegistry = await createPackageFolderHierarchy(year, monthName, packageName);
              targetFolderId = folderRegistry.formulirPendaftaran;
            } catch (hErr) {
              console.warn("[register] Package folder hierarchy warning, fallback to root FORMULIR PENDAFTARAN:", hErr);
            }
          }

          if (!targetFolderId) {
            targetFolderId = await getOrCreateFolder("FORMULIR PENDAFTARAN");
          }

          await driveStorage.upload(pdfFilename, pdfBuffer, "application/pdf", targetFolderId);
          console.log("[register] PDF formulir berhasil disimpan ke Google Drive:", pdfFilename, "Folder ID:", targetFolderId);
        } else {
          console.warn("[register] Google Drive belum dikonfigurasi di Vercel env (GOOGLE_DRIVE_FOLDER_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)");
        }
      } catch (driveErr: any) {
        console.error("[register] CRITICAL Google Drive PDF upload error:", driveErr?.message || driveErr);
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
          `Assalamu'alaikum Warahmatullahi Wabarakatuh.`,
          "",
          `Terima kasih telah mendaftar melalui portal registrasi VTU ABADI Travel.`,
          `Pendaftaran Anda telah kami terima dengan detail sebagai berikut:`,
          "",
          `  ✅ No. Registrasi   : ${kodeRegistrasi}`,
          `  👤 Nama PIC         : ${namaPerwakilan}`,
          `  📦 Paket Umroh      : ${paket?.namaPaket ?? "-"}`,
          `  👥 Jumlah Jamaah    : ${body.paxCount} PAX`,
          `  🛏️  Preferensi Kamar: ${(body.roomUpgrade || "quad").toUpperCase()}`,
          `  📞 WhatsApp PIC     : ${body.nomorTelepon}`,
          "",
          `📎 Formulir Pendaftaran Resmi terlampir dalam email ini (file PDF).`,
          `   Simpan dokumen ini sebagai bukti pendaftaran Anda.`,
          "",
          `⏳ Selanjutnya:`,
          `   Tim operasional kami akan menghubungi Anda via WhatsApp dalam 1-2 hari kerja`,
          `   untuk konfirmasi pembayaran Down Payment (DP) dan verifikasi berkas.`,
          "",
          `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
          "",
          `Hormat kami,`,
          `Tim VTU ABADI Travel`,
          `📧 info@vtuabadi.com | 📞 +62-xxx-xxxx-xxxx`,
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
          localFilePath,
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
        detail: `PDF: ${pdfPath || "gagal"} (Vault: ${localFilePath || "not-saved"}) | Email: ${emailStatus} | Ke: ${body.emailPerwakilan}`,
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
