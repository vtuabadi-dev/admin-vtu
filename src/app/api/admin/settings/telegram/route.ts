import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import {
  getTelegramConfig,
  updateTelegramConfig,
  sendPackageBroadcast,
} from "@/server/services/telegram-broadcast.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  const config = getTelegramConfig();

  // Mask botToken for security when sending to frontend
  let maskedToken = "";
  if (config.botToken && config.botToken.length > 10) {
    maskedToken = config.botToken.slice(0, 6) + "••••••••" + config.botToken.slice(-4);
  } else if (config.botToken) {
    maskedToken = "••••••••";
  }

  return NextResponse.json({
    success: true,
    data: {
      botToken: config.botToken,
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

  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "test") {
      const targetGroup = body.targetGroup === "surabaya" ? "surabaya" : "jakarta";
      const configOverride: any = {};
      if (body.botToken) configOverride.botToken = body.botToken;
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

    // Save updated configuration
    const updated = updateTelegramConfig({
      botToken: body.botToken !== undefined ? body.botToken : undefined,
      groupIdJakarta: body.groupIdJakarta !== undefined ? body.groupIdJakarta : undefined,
      groupIdSurabaya: body.groupIdSurabaya !== undefined ? body.groupIdSurabaya : undefined,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Konfigurasi Broadcast Telegram berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
