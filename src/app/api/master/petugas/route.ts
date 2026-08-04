import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db";

// GET: Ambil daftar petugas berdasarkan tipe
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipe = searchParams.get("tipe"); // TOUR_LEADER atau MUTHOWIF
  const search = searchParams.get("search") || "";

  try {
    const data = await prisma.masterPetugas.findMany({
      where: {
        ...(tipe ? { tipe } : {}),
        ...(search ? { nama: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Tambah petugas baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();
    const { nama, tipe, noHp, kode } = body;

    if (!nama || !tipe) {
      return NextResponse.json({ success: false, message: "Nama dan tipe petugas wajib diisi" }, { status: 400 });
    }

    const data = await prisma.masterPetugas.create({
      data: {
        nama,
        tipe,
        noHp: noHp || null,
        kode: kode || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
