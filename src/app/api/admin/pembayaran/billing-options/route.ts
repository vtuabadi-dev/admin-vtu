import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

const DEFAULT_TAMBAHAN_OPTIONS = [
  "Upgrade Kamar Double",
  "Upgrade Kamar Single",
  "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
  "Upgrade Hotel Bintang 5",
  "Paspor Express & Penanganan Dokumen",
  "Perlengkapan Tambahan & Handling",
  "Ongkos Jahit Seragam Batik",
  "Sewa Kursi Roda & Muthawwif Pendorong",
  "Pengurusan Visa Khusus / Single",
  "Biaya Overbagasi / Airport Handling",
];

const DEFAULT_POTONGAN_OPTIONS = [
  "Diskon Promo Early Bird",
  "Voucher Potongan Khusus",
  "Potongan Group / Cashback",
  "Keringanan Biaya Anak / Balita",
  "Potongan Manajemen / Direksi",
  "Diskon Spesial Mitra",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let rows = await prisma.masterBillingOption.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed defaults if table is completely empty
    if (rows.length === 0) {
      const seedData = [
        ...DEFAULT_TAMBAHAN_OPTIONS.map((nama) => ({ kategori: "tambahan", nama })),
        ...DEFAULT_POTONGAN_OPTIONS.map((nama) => ({ kategori: "potongan", nama })),
      ];
      await prisma.masterBillingOption.createMany({ data: seedData });
      rows = await prisma.masterBillingOption.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }

    const tambahan = rows.filter((r) => r.kategori === "tambahan").map((r) => r.nama);
    const potongan = rows.filter((r) => r.kategori === "potongan").map((r) => r.nama);

    return NextResponse.json({
      success: true,
      data: { tambahan, potongan, all: rows },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kategori, nama } = await request.json();
    if (!kategori || !nama || !nama.trim()) {
      return NextResponse.json({ success: false, message: "Kategori dan nama wajib diisi" }, { status: 400 });
    }

    const cleanName = nama.trim();
    const cleanKategori = kategori === "potongan" ? "potongan" : "tambahan";

    const existing = await prisma.masterBillingOption.findFirst({
      where: { kategori: cleanKategori, nama: cleanName, isActive: true },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Item sudah ada" });
    }

    const created = await prisma.masterBillingOption.create({
      data: {
        kategori: cleanKategori,
        nama: cleanName,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, oldNama, newNama, kategori } = await request.json();
    if (!newNama || !newNama.trim()) {
      return NextResponse.json({ success: false, message: "Nama baru wajib diisi" }, { status: 400 });
    }

    const cleanNew = newNama.trim();

    if (id) {
      const updated = await prisma.masterBillingOption.update({
        where: { id },
        data: { nama: cleanNew },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Lookup by oldNama & kategori
    if (oldNama && kategori) {
      const target = await prisma.masterBillingOption.findFirst({
        where: { kategori, nama: oldNama, isActive: true },
      });
      if (target) {
        const updated = await prisma.masterBillingOption.update({
          where: { id: target.id },
          data: { nama: cleanNew },
        });
        return NextResponse.json({ success: true, data: updated });
      }
    }

    return NextResponse.json({ success: false, message: "Item tidak ditemukan" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, nama, kategori } = await request.json();

    if (id) {
      await prisma.masterBillingOption.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (nama && kategori) {
      const target = await prisma.masterBillingOption.findFirst({
        where: { kategori, nama, isActive: true },
      });
      if (target) {
        await prisma.masterBillingOption.delete({ where: { id: target.id } });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Parameter tidak lengkap" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
