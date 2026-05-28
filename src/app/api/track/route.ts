import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registrationRepo, invoiceRepo, pembayaranRepo } from "@/server/repositories";

// GET /api/track?kode=GRP-XXXX-XXXXX — public registration status check
export async function GET(request: NextRequest) {
  const kode = request.nextUrl.searchParams.get("kode")?.trim().toUpperCase();

  if (!kode) {
    return NextResponse.json({ success: false, message: "Kode registrasi diperlukan" }, { status: 400 });
  }

  try {
    const reg = await registrationRepo.findByKode(kode);
    if (!reg) {
      return NextResponse.json({ success: false, message: "Kode registrasi tidak ditemukan" }, { status: 404 });
    }

    // Get group/payment info if registration has been approved
    let invoices: any[] = [];
    let payments: any[] = [];
    let groupInfo: any = null;

    if (reg.groupId) {
      try {
        const { prisma } = await import("@/server/db/client");
        const group = await prisma.registrationGroup.findUnique({
          where: { id: reg.groupId },
          include: {
            keberangkatan: { select: { namaPaket: true, kode: true, tanggalBerangkat: true, tanggalPulang: true } },
          },
        });
        if (group) {
          groupInfo = {
            namaGroup: group.namaGroup,
            totalTagihan: group.totalTagihan,
            totalPembayaran: group.totalPembayaran,
            sisaPembayaran: group.sisaPembayaran,
            status: group.status,
            paket: group.keberangkatan,
          };
          invoices = await invoiceRepo.findByGroup(group.id);
          payments = await pembayaranRepo.findByGroup(group.id);
        }
      } catch { /* non-critical */ }
    }

    // Map internal status to user-friendly labels
    const statusLabel = getStatusLabel(reg.status);

    // Build progress steps
    const progress = buildProgress(reg.status, invoices, payments);

    return NextResponse.json({
      success: true,
      data: {
        kodeRegistrasi: reg.kodeRegistrasi,
        namaPerwakilan: reg.namaPerwakilan,
        status: reg.status,
        statusLabel,
        paxCount: reg.paxCount,
        members: reg.members.map((m: any) => ({ namaLengkap: m.namaLengkap, jenisKelamin: m.jenisKelamin })),
        groupInfo,
        invoices: invoices.map((inv: any) => ({
          nomorInvoice: inv.nomorInvoice,
          tipe: inv.tipe,
          jumlah: inv.jumlah,
          sisa: inv.sisaTagihan,
          status: inv.status,
          jatuhTempo: inv.jatuhTempo,
        })),
        payments: payments.map((p: any) => ({
          jumlah: p.jumlah,
          metode: p.metode,
          tanggal: p.tanggal,
          status: p.status,
        })),
        progress,
        createdAt: reg.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Gagal memeriksa status" }, { status: 500 });
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Menunggu Diproses",
    PENDING_REVIEW: "Sedang Ditinjau Admin",
    APPROVED: "Disetujui — Menunggu Pembuatan Akun",
    ACCOUNT_CREATED: "Akun Jamaah Sudah Dibuat",
    ACTIVE: "Aktif",
    REJECTED: "Ditolak — Lihat Catatan Admin",
    CANCELLED: "Dibatalkan",
    EXPIRED: "Kedaluwarsa",
  };
  return labels[status] ?? status;
}

function buildProgress(status: string, invoices: any[], payments: any[]): { step: string; label: string; done: boolean; current: boolean }[] {
  const hasInvoices = invoices.length > 0;
  const allPaid = hasInvoices && invoices.every((inv: any) => inv.status === "paid");
  const anyPaymentApproved = payments.some((p: any) => p.status === "verified");

  const steps = [
    { step: "registered", label: "Pendaftaran Diterima", done: status !== "DRAFT" },
    { step: "review", label: "Sedang Ditinjau Admin", done: ["APPROVED", "ACCOUNT_CREATED", "ACTIVE"].includes(status) },
    { step: "approved", label: "Pendaftaran Disetujui", done: ["ACCOUNT_CREATED", "ACTIVE"].includes(status) },
    { step: "invoiced", label: "Invoice Diterbitkan", done: hasInvoices },
    { step: "payment", label: "Pembayaran DP Diterima", done: anyPaymentApproved },
    { step: "active", label: "Persiapan Keberangkatan", done: status === "ACTIVE" || allPaid },
  ];

  // Find current step (first non-done step)
  let foundCurrent = false;
  return steps.map((s) => {
    const isCurrent = !foundCurrent && !s.done;
    if (isCurrent) foundCurrent = true;
    return { ...s, current: isCurrent };
  });
}
