import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const {
      statusKunjungan,
      hasilKunjungan,
      minatBulan,
      minatJenisPaket,
      minatTanggal,
      catatanHasil,
    } = body;

    const existing = await prisma.bukuTamu.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Data tamu tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (statusKunjungan) updateData.statusKunjungan = statusKunjungan;
    if (hasilKunjungan) updateData.hasilKunjungan = hasilKunjungan;
    if (minatBulan !== undefined) updateData.minatBulan = minatBulan || null;
    if (minatJenisPaket !== undefined) updateData.minatJenisPaket = minatJenisPaket || null;
    if (minatTanggal !== undefined) {
      updateData.minatTanggal = minatTanggal ? new Date(minatTanggal) : null;
    }
    if (catatanHasil !== undefined) updateData.catatanHasil = catatanHasil || null;

    const updated = await prisma.bukuTamu.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Forbidden — Super Admin only" },
      { status: 403 }
    );
  }

  const { id } = params;

  try {
    await prisma.bukuTamu.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Data buku tamu berhasil dihapus" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
