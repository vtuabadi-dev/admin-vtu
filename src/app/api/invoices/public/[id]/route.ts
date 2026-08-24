import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";

// GET /api/invoices/public/[id]?kode=GRP-XXXX
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invId = decodeURIComponent(params.id || "").trim();
  const kode = request.nextUrl.searchParams.get("kode")?.trim().toUpperCase();

  if (!invId && !kode) {
    return NextResponse.json(
      { success: false, message: "ID invoice atau kode registrasi diperlukan" },
      { status: 400 }
    );
  }

  try {
    // 1. Try finding in Invoice table by id or nomorInvoice
    let invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ id: invId }, { nomorInvoice: invId }],
      },
      include: {
        items: true,
        group: {
          include: {
            keberangkatan: true,
            ketuaGroup: true,
          },
        },
      },
    });

    // 2. If not found in Invoice table, try finding in Pembayaran table
    let payment = await prisma.pembayaran.findFirst({
      where: {
        OR: [{ invoiceId: invId }, { id: invId }],
      },
      include: {
        group: {
          include: {
            keberangkatan: true,
            ketuaGroup: true,
          },
        },
      },
    });

    // 3. If still not found and kode is provided, lookup by group kode
    let group = invoice?.group || payment?.group || null;
    if (!group && kode) {
      group = await prisma.registrationGroup.findUnique({
        where: { kodeRegistrasi: kode },
        include: {
          keberangkatan: true,
          ketuaGroup: true,
        },
      });
    }

    if (!invoice && !payment && !group) {
      return NextResponse.json(
        { success: false, message: "Dokumen invoice tidak ditemukan" },
        { status: 404 }
      );
    }

    const payload = {
      invoiceNumber: invoice?.nomorInvoice || payment?.invoiceId || invId,
      invoiceDate: invoice?.createdAt
        ? new Date(invoice.createdAt).toISOString().slice(0, 10)
        : payment?.tanggal
        ? new Date(payment.tanggal).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: invoice?.jatuhTempo
        ? new Date(invoice.jatuhTempo).toISOString().slice(0, 10)
        : undefined,
      namaGroup: group?.namaGroup || "Bapak/Ibu Jamaah",
      kodeRegistrasi: group?.kodeRegistrasi || kode || "-",
      namaPaket: group?.keberangkatan?.namaPaket || "Paket Umroh VTU ABADI",
      tanggalBerangkat: group?.keberangkatan?.tanggalBerangkat
        ? new Date(group.keberangkatan.tanggalBerangkat).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : undefined,
      jenisPembayaran: invoice?.tipe || payment?.catatan || "Pembayaran Umroh",
      nominal: payment?.jumlah || invoice?.jumlah || 0,
      metode: payment?.metode || "Transfer Bank",
      bank: payment?.bankPengirim || "BSI / Mandiri",
      nomorRekening: payment?.nomorRekening || "-",
      catatan: payment?.catatan || (invoice as any)?.catatan || "",
      totalTagihan: group?.totalTagihan || invoice?.jumlah || payment?.jumlah || 0,
      totalPembayaran: group?.totalPembayaran || payment?.jumlah || 0,
      sisaTagihan: group?.sisaPembayaran !== undefined ? group.sisaPembayaran : 0,
      status: invoice?.status || payment?.status || "verified",
      picPhone: group?.ketuaGroup?.nomorTelepon,
      picEmail: group?.ketuaGroup?.email,
    };

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
