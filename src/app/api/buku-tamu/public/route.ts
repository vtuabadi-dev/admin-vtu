import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaTamu, nomorWa, keperluan, adminId, adminName, kantorCabang } = body;

    if (!namaTamu || typeof namaTamu !== "string" || !namaTamu.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap jamaah wajib diisi" },
        { status: 400 }
      );
    }

    if (!nomorWa || typeof nomorWa !== "string" || !nomorWa.trim()) {
      return NextResponse.json(
        { success: false, message: "Nomor WhatsApp wajib diisi" },
        { status: 400 }
      );
    }

    // Clean phone number
    let cleanPhone = nomorWa.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("62")) {
      cleanPhone = "0" + cleanPhone.slice(2);
    } else if (cleanPhone.startsWith("8")) {
      cleanPhone = "0" + cleanPhone;
    }

    // Resolve Admin and Branch
    let resolvedAdminId = adminId || "online-guestbook";
    let resolvedAdminName = adminName || "Website Buku Tamu";
    let resolvedBranch = kantorCabang || "Malang";

    if (adminId && adminId !== "online-guestbook") {
      try {
        const foundUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: adminId },
              { name: { equals: adminId, mode: "insensitive" } },
              { email: { equals: adminId, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, kantorCabang: true },
        });

        if (foundUser) {
          resolvedAdminId = foundUser.id;
          resolvedAdminName = foundUser.name || resolvedAdminName;
          resolvedBranch = foundUser.kantorCabang || resolvedBranch;
        }
      } catch (adminErr) {
        console.warn("[BukuTamu Public] Gagal resolve adminId:", adminErr);
      }
    }

    const created = await prisma.bukuTamu.create({
      data: {
        namaTamu: namaTamu.trim(),
        nomorWa: cleanPhone,
        keperluan: keperluan && typeof keperluan === "string" && keperluan.trim() !== ""
          ? keperluan.trim()
          : "Konsultasi Paket Umroh",
        kantorCabang: resolvedBranch,
        adminId: resolvedAdminId,
        adminName: resolvedAdminName,
        statusKunjungan: "SEDANG_BERKUNJUNG",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Buku tamu berhasil disimpan",
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[BukuTamu Public POST Error]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
