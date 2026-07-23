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
    const { status, sertifikatUrl, videoUrl, catatan } = body;

    const updated = await prisma.badalUmrohRegistration.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(sertifikatUrl !== undefined ? { sertifikatUrl } : {}),
        ...(videoUrl !== undefined ? { videoUrl } : {}),
        ...(catatan !== undefined ? { catatan } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "Data Badal Umroh berhasil diperbarui" });
  } catch (error: any) {
    console.error("[BADAL UMROH PATCH ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal memperbarui data Badal Umroh" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await prisma.badalUmrohRegistration.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Data Badal Umroh berhasil dihapus" });
  } catch (error: any) {
    console.error("[BADAL UMROH DELETE ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus data Badal Umroh" }, { status: 500 });
  }
}
