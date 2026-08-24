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

    if (!body.signaturePath && !body.signatureBase64) {
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

    // ── Signature Processing ──
    let finalSignaturePath = body.signaturePath || "";
    let signatureBuffer: Buffer | null = null;

    // Check if raw base64 dataUrl is provided
    const rawSigBase64 = body.signatureBase64 || (body.signaturePath?.startsWith("data:image") ? body.signaturePath : undefined);
    if (rawSigBase64) {
      try {
        const base64Data = rawSigBase64.includes(",") ? rawSigBase64.split(",")[1] : rawSigBase64;
        if (base64Data) {
          signatureBuffer = Buffer.from(base64Data, "base64");
        }
      } catch (err) {
        console.warn("[register] Base64 signature decode warning:", err);
      }
    }

    // Save final signature to storage (uses existing pre-provisioned package folder)
    try {
      const { getStorageAdapter } = await import("@/server/storage");
      const { isGoogleDriveConfigured, provisionPackageStorage } = await import("@/server/storage/google-drive");
      const storage = getStorageAdapter();
      const newPath = signaturePath(kodeRegistrasi);

      // If buffer not yet extracted from base64, attempt storage download of temp path
      if (!signatureBuffer && body.signaturePath && !body.signaturePath.startsWith("data:")) {
        try {
          signatureBuffer = await storage.download(body.signaturePath);
        } catch {
          try {
            const { createLocalAdapter } = await import("@/server/storage/local");
            const localAdapter = createLocalAdapter();
            signatureBuffer = await localAdapter.download(body.signaturePath);
          } catch {
            signatureBuffer = null;
          }
        }
      }

      if (signatureBuffer) {
        let signatureFolderId: string | undefined = undefined;
        if (isGoogleDriveConfigured()) {
          const driveFolders = (paket?.driveFolderIds as Record<string, string> | null) || null;
          signatureFolderId = driveFolders?.tandaTangan;

          if (!signatureFolderId || signatureFolderId === "local-mock") {
            if (paket?.id) {
              const regStorage = await provisionPackageStorage(paket.id);
              signatureFolderId = regStorage?.tandaTangan;
            }
          }
          if (!signatureFolderId) {
            signatureFolderId = process.env.GOOGLE_DRIVE_TANDA_TANGAN_FOLDER_ID || "1F1lVi0_54Dre-lo941x6RmkzJAsiUrvC";
          }
        }

        finalSignaturePath = await storage.upload(newPath, signatureBuffer, "image/png", signatureFolderId);
        if (body.signaturePath && body.signaturePath.includes("tmp_")) {
          await storage.delete(body.signaturePath).catch(() => {});
        }
      }
    } catch (moveErr) {
      console.warn("[register] Signature storage notice:", moveErr);
    }

    // UPPERCASE all nama fields
    const namaPerwakilan = body.namaPerwakilan.toUpperCase().trim();
    const members = body.members.map((m, i) => ({
      namaLengkap: m.namaLengkap.toUpperCase().trim(),
      jenisKelamin: m.jenisKelamin,
      tempatLahir: m.tempatLahir ? m.tempatLahir.toUpperCase().trim() : undefined,
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
        signatureBuffer: signatureBuffer || undefined,
        signatureBase64: rawSigBase64 || undefined,
      } as any);

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

      // Save to Google Drive Cloud Vault V2 (Reads pre-provisioned Folder ID from DB - with auto-provision fallback)
      try {
        const { isGoogleDriveConfigured, provisionPackageStorage, getOrCreateFormulirPendaftaranDriveFolder } = await import("@/server/storage/google-drive");
        if (isGoogleDriveConfigured()) {
          const { getStorageAdapter } = await import("@/server/storage");
          const driveStorage = getStorageAdapter();

          const driveFolders = (paket?.driveFolderIds as Record<string, string> | null) || null;
          let targetFolderId = driveFolders?.formulirPendaftaran;

          if (!targetFolderId || targetFolderId === "local-mock") {
            console.log(`[register] Package "${paket?.namaPaket || body.paketId}" lacks valid pre-provisioned formulirPendaftaran folder ID in DB. Running fallback provisioning...`);
            if (paket?.id) {
              const registry = await provisionPackageStorage(paket.id);
              targetFolderId = registry?.formulirPendaftaran;
            }
            if (!targetFolderId || targetFolderId === "local-mock") {
              const rootParent = driveFolders?.rootPackageFolderId && driveFolders.rootPackageFolderId !== "local-mock"
                ? driveFolders.rootPackageFolderId
                : undefined;
              targetFolderId = await getOrCreateFormulirPendaftaranDriveFolder(rootParent);
            }
          }

          if (targetFolderId && targetFolderId !== "local-mock") {
            await driveStorage.upload(pdfFilename, pdfBuffer, "application/pdf", targetFolderId);
            console.log(`[register] PDF formulir berhasil disimpan ke Cloud Vault: ${pdfFilename} (Folder ID: ${targetFolderId})`);
          } else {
            console.warn(`[register] Storage Notice: STORAGE_NOT_PROVISIONED. Package "${paket?.namaPaket || body.paketId}" lacks folder ID.`);
          }
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
