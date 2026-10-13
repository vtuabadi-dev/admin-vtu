import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter"); // "all" | "mine"
  const kantor = searchParams.get("kantor");
  const search = searchParams.get("search");

  try {
    const whereClause: any = {};

    if (filter === "mine" && session.user.id) {
      whereClause.OR = [
        { adminId: session.user.id },
        { adminName: session.user.name || "" },
      ];
    }

    if (kantor && kantor !== "all") {
      whereClause.kantorCabang = { equals: kantor, mode: "insensitive" };
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { namaTamu: { contains: q, mode: "insensitive" } },
            { nomorWa: { contains: q, mode: "insensitive" } },
            { kotaAsal: { contains: q, mode: "insensitive" } },
            { adminName: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const data = await prisma.bukuTamu.findMany({
      where: whereClause,
      orderBy: { waktuKunjungan: "desc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { namaTamu, nomorWa, kotaAsal, keperluan, kantorCabang } = body;

    if (!namaTamu || !nomorWa) {
      return NextResponse.json(
        { success: false, message: "Nama tamu dan nomor WhatsApp wajib diisi" },
        { status: 400 }
      );
    }

    // Resolve admin identity & kantor placement
    let adminOffice = kantorCabang;
    let dbUser = null;
    if (session.user.id && !session.user.id.startsWith("mock-")) {
      dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    }
    if (!dbUser && session.user.email) {
      dbUser = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase().trim() } });
    }

    if (!adminOffice) {
      adminOffice = dbUser?.kantorCabang || "Malang";
    }

    const created = await prisma.bukuTamu.create({
      data: {
        namaTamu: namaTamu.trim(),
        nomorWa: nomorWa.trim(),
        kotaAsal: kotaAsal ? kotaAsal.trim() : null,
        keperluan: keperluan ? keperluan.trim() : "Konsultasi Paket Umroh",
        kantorCabang: adminOffice,
        adminId: session.user.id || "admin",
        adminName: session.user.name || dbUser?.name || "Admin VTU",
        statusKunjungan: "SEDANG_BERKUNJUNG",
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
