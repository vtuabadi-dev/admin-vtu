import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const gudangList = await prisma.masterGudang.findMany({
      orderBy: { kodeGudang: "asc" },
      include: {
        _count: {
          select: { stokItems: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: gudangList,
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
    const body = await request.json();
    const { kodeGudang, namaGudang, alamat, penanggungJawab } = body;

    if (!kodeGudang || !namaGudang) {
      return NextResponse.json({ success: false, message: "Kode dan Nama Gudang wajib diisi" }, { status: 400 });
    }

    const created = await prisma.masterGudang.create({
      data: {
        kodeGudang: kodeGudang.trim().toUpperCase(),
        namaGudang: namaGudang.trim(),
        alamat: alamat || null,
        penanggungJawab: penanggungJawab || null,
      }
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
    const body = await request.json();
    const { id, namaGudang, alamat, penanggungJawab, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Gudang wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.masterGudang.update({
      where: { id },
      data: {
        ...(namaGudang ? { namaGudang: namaGudang.trim() } : {}),
        ...(alamat !== undefined ? { alamat } : {}),
        ...(penanggungJawab !== undefined ? { penanggungJawab } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
