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

    if (!body.termsAccepted || !(body as any).termsSyarat || !(body as any).termsPembayaran || !(body as any).termsPembatalan || !(body as any).termsData) {
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

    // ── Generate PDF ────────────────────────────────────────
    let pdfPath = "";
    try {
      const { generateRegistrationPdf } = await import("@/server/services/registration-pdf.service");
      const pdfBuffer = await generateRegistrationPdf({
        registration: reg,
        packageInfo: (paket as any) ?? null,
        termsVersion: (body as any).termsVersion || "1.0",
        termsAcceptedAt: reg.termsAcceptedAt ?? reg.createdAt,
        signedAt: reg.signedAt,
      });

      const storage = getStorageAdapter();
      pdfPath = `registrations/${kodeRegistrasi}/formulir-pendaftaran.pdf`;
      await storage.upload(pdfPath, pdfBuffer, "application/pdf");
    } catch (err) {
      console.error("[register] PDF generation failed:", err);
      // Non-blocking — registration still succeeds
    }

    // ── Send confirmation email ─────────────────────────────
    let emailStatus = "not_sent";
    try {
      const { getNotificationProvider } = await import("@/server/services/notify");
      const notifier = getNotificationProvider();
      await notifier.send({
        channel: "email",
        recipient: body.emailPerwakilan,
        subject: "Konfirmasi Registrasi Jamaah — " + kodeRegistrasi,
        body: [
          `Yth. ${namaPerwakilan},`,
          "",
          `Terima kasih telah melakukan pendaftaran melalui portal registrasi kami.`,
          "",
          `Berikut ringkasan pendaftaran Anda:`,
          `  No. Registrasi: ${kodeRegistrasi}`,
          `  Paket: ${paket?.namaPaket ?? "-"}`,
          `  Jumlah Jamaah: ${body.paxCount} orang`,
          `  Preferensi Kamar: ${body.roomUpgrade?.toUpperCase() ?? "MIX"}`,
          "",
          `Status pendaftaran Anda saat ini: BARU.`,
          `Tim travel kami akan menghubungi Anda dalam 1-2 hari kerja untuk proses selanjutnya.`,
          "",
          `Formulir registrasi terlampir dalam email ini untuk arsip Anda.`,
          "",
          `Jika ada pertanyaan, silakan hubungi kami melalui WhatsApp.`,
          "",
          `Hormat kami,`,
          `Tim VTU Operasional`,
        ].join("\n"),
        metadata: {
          kodeRegistrasi,
          pdfPath,
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
        detail: `PDF: ${pdfPath || "gagal"} | Email: ${emailStatus} | Ke: ${body.emailPerwakilan}`,
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
