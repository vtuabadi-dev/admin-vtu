import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

const DEFAULT_TAMBAHAN_OPTIONS = [
  "Upgrade Kamar Double",
  "Upgrade Kamar Triple",
  "Upgrade Kamar Single",
  "Upgrade Hotel",
  "Kereta Cepat Haramain",
  "Biaya Layanan Paspor",
  "Perlengkapan Tambahan",
  "Ongkos Jahit Seragam Batik",
  "Sewa Kursi Roda",
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

function getLogicalScore(name: string): number {
  const l = name.toLowerCase().trim();
  if (l.includes("double")) return 10;
  if (l.includes("triple")) return 20;
  if (l.includes("single")) return 30;
  if (l.includes("hotel")) return 40;
  if (l.includes("kereta")) return 50;
  if (l.includes("paspor")) return 60;
  if (l.includes("perlengkapan")) return 70;
  if (l.includes("batik") || l.includes("jahit")) return 80;
  if (l.includes("kursi") || l.includes("roda")) return 90;
  if (l.includes("visa")) return 100;
  if (l.includes("bagasi")) return 110;
  return 200;
}

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

    let tambahan = rows.filter((r) => r.kategori === "tambahan").map((r) => r.nama);
    let potongan = rows.filter((r) => r.kategori === "potongan").map((r) => r.nama);

    // Check custom drag & drop sequence stored in SystemSetting
    let customOrderSetting = null;
    try {
      customOrderSetting = await prisma.systemSetting.findUnique({
        where: { key: "billing_options_order" },
      });
    } catch {}

    const orderMap = (customOrderSetting?.value as { tambahan?: string[]; potongan?: string[] }) || {};

    if (Array.isArray(orderMap.tambahan) && orderMap.tambahan.length > 0) {
      const orderTambahan = orderMap.tambahan;
      tambahan.sort((a, b) => {
        const idxA = orderTambahan.indexOf(a);
        const idxB = orderTambahan.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return getLogicalScore(a) - getLogicalScore(b);
      });
    } else {
      // Apply clean logical default ordering (room upgrades together, followed by hotel, train, etc.)
      tambahan.sort((a, b) => getLogicalScore(a) - getLogicalScore(b));
    }

    if (Array.isArray(orderMap.potongan) && orderMap.potongan.length > 0) {
      const orderPotongan = orderMap.potongan;
      potongan.sort((a, b) => {
        const idxA = orderPotongan.indexOf(a);
        const idxB = orderPotongan.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }

    return NextResponse.json({
      success: true,
      data: { tambahan, potongan, all: rows },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, kategori, options } = body;

    if (action === "reorder" && (kategori === "tambahan" || kategori === "potongan") && Array.isArray(options)) {
      const cleanKategori = kategori;
      const cleanOptions = options.map((s: any) => String(s).trim()).filter(Boolean);

      let existing = null;
      try {
        existing = await prisma.systemSetting.findUnique({
          where: { key: "billing_options_order" },
        });
      } catch {}

      const currentVal = (existing?.value as Record<string, any>) || {};
      const updatedVal = {
        ...currentVal,
        [cleanKategori]: cleanOptions,
      };

      await prisma.systemSetting.upsert({
        where: { key: "billing_options_order" },
        create: {
          key: "billing_options_order",
          value: updatedVal,
        },
        update: {
          value: updatedVal,
        },
      });

      return NextResponse.json({ success: true, data: updatedVal });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
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
