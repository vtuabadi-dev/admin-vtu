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
    const groupInclude = {
      keberangkatan: {
        select: {
          id: true,
          kode: true,
          namaPaket: true,
          hargaPaket: true,
          tanggalBerangkat: true,
          tanggalPulang: true,
          hotelMekkah: true,
          hotelMadinah: true,
          packageType: { select: { name: true } },
        },
      },
      ketuaGroup: {
        select: {
          id: true,
          namaLengkap: true,
          nomorTelepon: true,
          email: true,
          alamat: true,
        },
      },
      anggota: {
        select: {
          id: true,
          namaLengkap: true,
          nomorPeserta: true,
          nomorTelepon: true,
          email: true,
          alamat: true,
        },
      },
      pembayaran: {
        select: {
          id: true,
          tanggal: true,
          jumlah: true,
          metode: true,
          bankPengirim: true,
          status: true,
          catatan: true,
          invoiceId: true,
        },
        orderBy: { tanggal: "asc" as const },
      },
    };

    // 1. Try finding in Invoice table by id or nomorInvoice
    let invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ id: invId }, { nomorInvoice: invId }],
      },
      include: {
        items: true,
        group: {
          include: groupInclude,
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
          include: groupInclude,
        },
      },
    });

    // 3. If still not found and kode is provided, lookup by group kode
    let group = invoice?.group || payment?.group || null;
    if (!group && kode) {
      group = await prisma.registrationGroup.findUnique({
        where: { kodeRegistrasi: kode },
        include: groupInclude,
      });
    }

    if (!invoice && !payment && !group) {
      return NextResponse.json(
        { success: false, message: "Dokumen invoice tidak ditemukan" },
        { status: 404 }
      );
    }

    // Build Payment History
    const history: any[] = [];
    if (group?.pembayaran && group.pembayaran.length > 0) {
      group.pembayaran.forEach((p: any) => {
        const itemTgl = p.tanggal
          ? new Date(p.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "-";
        history.push({
          tanggal: itemTgl,
          metode: p.bankPengirim ? `TF ${p.bankPengirim.toUpperCase()}` : (p.metode || "TF MANDIRI").toUpperCase(),
          nominal: p.jumlah || 0,
        });
      });
    } else if (payment) {
      const pTgl = payment.tanggal
        ? new Date(payment.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
        : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      history.push({
        tanggal: pTgl,
        metode: payment.bankPengirim ? `TF ${payment.bankPengirim.toUpperCase()}` : "TF MANDIRI",
        nominal: payment.jumlah || 0,
      });
    }

    // Build Members List (A/N)
    const membersList: string[] = [];
    if (group?.anggota && group.anggota.length > 0) {
      group.anggota.forEach((m: any) => {
        if (m.namaLengkap) membersList.push(m.namaLengkap);
      });
    } else if (group?.namaGroup) {
      membersList.push(group.namaGroup);
    }

    const payload = {
      invoiceNumber: invoice?.nomorInvoice || payment?.invoiceId || invId,
      invoiceDate: invoice?.createdAt
        ? new Date(invoice.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
        : payment?.tanggal
        ? new Date(payment.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
        : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
      idReg: group?.kodeRegistrasi?.replace(/[^0-9]/g, "").slice(-4) || "3575",
      kode: group?.kodeRegistrasi?.slice(-3) || "104",
      dueDate: invoice?.jatuhTempo
        ? new Date(invoice.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : undefined,
      namaGroup: group?.namaGroup || "Bapak/Ibu Jamaah",
      alamat: group?.ketuaGroup?.alamat || "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG",
      telepon: group?.ketuaGroup?.nomorTelepon,
      kodeRegistrasi: group?.kodeRegistrasi || kode || "-",
      namaPaket: group?.keberangkatan?.namaPaket || "PAKET UMROH 10 H SBY ( JED.C )",
      tipePaket: group?.keberangkatan?.packageType?.name || "SILVER",
      jumlahPax: membersList.length || 2,
      hargaSatuanPaket: group?.keberangkatan?.hargaPaket || 37400000,
      tanggalBerangkat: group?.keberangkatan?.tanggalBerangkat
        ? new Date(group.keberangkatan.tanggalBerangkat).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : undefined,
      hotelMekkah: group?.keberangkatan?.hotelMekkah || "GRAND AL MASSA",
      hotelMadinah: group?.keberangkatan?.hotelMadinah || "DURRAT AL EIMAN",
      anggota: membersList,
      paymentHistory: history,
      jenisPembayaran: invoice?.tipe || payment?.catatan || "Pembayaran Umroh",
      nominal: payment?.jumlah || invoice?.jumlah || 0,
      metode: payment?.metode || "Transfer Bank",
      bank: payment?.bankPengirim || "MANDIRI",
      nomorRekening: payment?.nomorRekening || "-",
      catatan: payment?.catatan || (invoice as any)?.catatan || "",
      totalTagihan: group?.totalTagihan || invoice?.jumlah || payment?.jumlah || 0,
      totalPembayaran: group?.totalPembayaran || payment?.jumlah || 0,
      sisaTagihan: group?.sisaPembayaran !== undefined ? group.sisaPembayaran : 0,
      maksimalPelunasan: invoice?.jatuhTempo
        ? new Date(invoice.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "6 September 2026",
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
