import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, fotoPenyerahanUrl, catatan } = body;

    const updated = await prisma.wakafQuranRegistration.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(fotoPenyerahanUrl !== undefined ? { fotoPenyerahanUrl } : {}),
        ...(catatan !== undefined ? { catatan } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "Data Wakaf Qur'an berhasil diperbarui" });
  } catch (error: any) {
    console.error("[WAKAF QURAN PATCH ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui data Wakaf Qur'an" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await prisma.wakafQuranRegistration.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Data Wakaf Qur'an berhasil dihapus" });
  } catch (error: any) {
    console.error("[WAKAF QURAN DELETE ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus data Wakaf Qur'an" }, { status: 500 });
  }
}
