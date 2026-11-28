import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import {
  getTelegramConfig,
  updateTelegramConfig,
  sendPackageBroadcast,
} from "@/server/services/telegram-broadcast.service";

export const dynamic = "force-dynamic";

function isAuthorizedTelegramAdmin(session: any): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const secondaryRoles = (session.user.secondaryRoles || []) as string[];
  return (
    role === "super_admin" ||
    role === "admin_operasional" ||
    secondaryRoles.includes("super_admin") ||
    secondaryRoles.includes("admin_operasional")
  );
}

function getMaskedToken(botToken: string | null | undefined): string {
  if (!botToken) return "";
  if (botToken.length > 10) {
    return botToken.slice(0, 6) + "••••••••" + botToken.slice(-4);
  }
  return "••••••••";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthorizedTelegramAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const config = await getTelegramConfig();
  const maskedToken = getMaskedToken(config.botToken);

  return NextResponse.json({
    success: true,
    data: {
      maskedToken,
      groupIdJakarta: config.groupIdJakarta,
      groupIdSurabaya: config.groupIdSurabaya,
      enabled: config.enabled,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthorizedTelegramAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "test") {
      const targetGroup = body.targetGroup === "surabaya" ? "surabaya" : "jakarta";
      const configOverride: any = {};
      if (typeof body.botToken === "string" && body.botToken.trim() !== "" && !body.botToken.includes("•")) {
        configOverride.botToken = body.botToken.trim();
      }
      if (body.groupIdJakarta) configOverride.groupIdJakarta = body.groupIdJakarta;
      if (body.groupIdSurabaya) configOverride.groupIdSurabaya = body.groupIdSurabaya;
      if (body.enabled !== undefined) configOverride.enabled = Boolean(body.enabled);

      const result = await sendPackageBroadcast(
        {
          packages: [
            {
              namaPaket: `[TES BROADCAST] Paket Umroh ${targetGroup === "surabaya" ? "Surabaya" : "Jakarta"}`,
              maskapai: "Saudia Airlines",
              hotelMekkah: "Pulman Zamzam / Setaraf",
              hotelMadinah: "Frontel Al Harithia / Setaraf",
              hargaPaket: 32500000,
              kuota: 45,
              kodeIndividu: `VTU-9D-REG-${targetGroup === "surabaya" ? "SUB" : "JKT"}-SV-20260906`,
            },
          ],
          startingPointCode: targetGroup === "surabaya" ? "SUB" : "JKT",
          startingPointName: targetGroup === "surabaya" ? "Surabaya" : "Jakarta",
        },
        configOverride
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message || "Gagal mengirim pesan tes." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Pesan tes berhasil dikirim ke grup ${result.targetGroup}!`,
        data: result,
      });
    }

    // Save updated configuration (ignore empty botToken or botToken containing mask character '•')
    const updateData: any = {
      groupIdJakarta: body.groupIdJakarta !== undefined ? body.groupIdJakarta : undefined,
      groupIdSurabaya: body.groupIdSurabaya !== undefined ? body.groupIdSurabaya : undefined,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    };
    if (typeof body.botToken === "string" && body.botToken.trim() !== "" && !body.botToken.includes("•")) {
      updateData.botToken = body.botToken.trim();
    }

    const updated = await updateTelegramConfig(updateData);

    return NextResponse.json({
      success: true,
      message: "Konfigurasi Broadcast Telegram berhasil diperbarui.",
      data: {
        maskedToken: getMaskedToken(updated.botToken),
        groupIdJakarta: updated.groupIdJakarta,
        groupIdSurabaya: updated.groupIdSurabaya,
        enabled: updated.enabled,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
