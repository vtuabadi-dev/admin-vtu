import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public POST: Submit Pendaftaran Badal Umroh from Portal (Supports Multi-Badal)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      isJamaahVauza,
      namaPaketUmroh,
      namaPemohon,
      nomorWhatsapp,
      listAlmarhum,
      namaAlmarhum,
      jenisKelamin,
      metodeSouvenir,
      alamatPengiriman,
      buktiTransferUrl,
      buktiBayarUrl,
      catatan,
    } = body;

    if (!namaPemohon || !nomorWhatsapp) {
      return NextResponse.json({ success: false, message: "Mohon isi nama pemohon dan nomor WhatsApp" }, { status: 400 });
    }

    // Determine list of Almarhum entries
    let itemsToCreate: Array<{ namaAlmarhum: string; jenisKelamin: string }> = [];
    if (Array.isArray(listAlmarhum) && listAlmarhum.length > 0) {
      itemsToCreate = listAlmarhum
        .filter((item: any) => item && typeof item.namaAlmarhum === "string" && item.namaAlmarhum.trim().length > 0)
        .map((item: any) => ({
          namaAlmarhum: String(item.namaAlmarhum).trim(),
          jenisKelamin: item.jenisKelamin === "P" ? "P" : "L",
        }));
    } else if (namaAlmarhum && typeof namaAlmarhum === "string" && namaAlmarhum.trim()) {
      itemsToCreate = [{
        namaAlmarhum: String(namaAlmarhum).trim(),
        jenisKelamin: jenisKelamin === "P" ? "P" : "L",
      }];
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ success: false, message: "Mohon isi setidaknya satu nama Almarhum/ah" }, { status: 400 });
    }

    const souvenirInfo = metodeSouvenir === "dikirim"
      ? `Pengiriman Souvenir: Dikirim via Ekspedisi ke Alamat (${alamatPengiriman || "Alamat tidak diisi"})`
      : "Pengambilan Souvenir: Diambil di Kantor VTU";

    const proofUrl = buktiTransferUrl || buktiBayarUrl || null;

    // Create a record for each Almarhum entry
    const createdRecords = await Promise.all(
      itemsToCreate.map((item, idx) => {
        const batchInfo = itemsToCreate.length > 1 ? ` (Pengajuan Multi-Badal #${idx + 1} dari ${itemsToCreate.length})` : "";
        const finalCatatan = [catatan, souvenirInfo, batchInfo].filter(Boolean).join(" | ");

        return prisma.badalUmrohRegistration.create({
          data: {
            isJamaahVauza: Boolean(isJamaahVauza),
            namaPaketUmroh: isJamaahVauza && namaPaketUmroh ? String(namaPaketUmroh).trim() : null,
            namaPemohon: String(namaPemohon).trim(),
            nomorWhatsapp: String(nomorWhatsapp).trim(),
            namaAlmarhum: item.namaAlmarhum,
            jenisKelamin: item.jenisKelamin,
            hubungan: "Keluarga",
            paketBadal: "Standard",
            catatan: finalCatatan,
            paymentStatus: proofUrl ? "Menunggu Konfirmasi" : "Belum Bayar",
            buktiBayarUrl: proofUrl,
            status: "Pending",
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: createdRecords.length === 1 ? createdRecords[0] : createdRecords,
      count: createdRecords.length,
      message: `${createdRecords.length} Pendaftaran Badal Umroh berhasil disimpan`,
    });
  } catch (error: any) {
    console.error("[BADAL UMROH POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan pendaftaran Badal Umroh" }, { status: 500 });
  }
}

// Admin GET: List all Badal Umroh Registrations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const list = await prisma.badalUmrohRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("[BADAL UMROH GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil data Badal Umroh" }, { status: 500 });
  }
}
