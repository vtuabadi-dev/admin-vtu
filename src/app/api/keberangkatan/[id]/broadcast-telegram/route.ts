import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db/client";
import { sendPackageBroadcast } from "@/server/services/telegram-broadcast.service";
import { getStorageAdapter } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "keberangkatan", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const pkg = await prisma.keberangkatan.findUnique({
      where: { id: params.id },
      include: {
        startingPoint: true,
        parentKeberangkatan: {
          include: {
            startingPoint: true,
          },
        },
        paketGrup: true,
      },
    });

    if (!pkg) {
      return NextResponse.json({ success: false, message: "Paket keberangkatan tidak ditemukan" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Resolve flyers: Prioritize payload flyerBase64List, then storage
    let flyers: string[] = [];
    if (Array.isArray(body.flyerBase64List) && body.flyerBase64List.length > 0) {
      flyers = body.flyerBase64List.filter(Boolean);
    } else if (body.flyerBase64) {
      flyers = [body.flyerBase64];
    } else {
      // Attempt to resolve existing flyers from package
      const rawFlyerSource = pkg.flyerUrl || pkg.flyerDriveId;
      if (rawFlyerSource) {
        const driveIdList = rawFlyerSource
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const storage = getStorageAdapter();
        for (const item of driveIdList) {
          if (item.startsWith("data:image")) {
            flyers.push(item);
            continue;
          }

          // Extract drive ID if it's a URL or direct ID
          let driveId = item;
          if (item.includes("id=")) {
            const m = item.match(/id=([a-zA-Z0-9_-]+)/);
            if (m && m[1]) driveId = m[1];
          } else if (item.startsWith("/api/storage/download?id=")) {
            driveId = item.replace("/api/storage/download?id=", "");
          }

          if (/^[a-zA-Z0-9_-]{15,}$/.test(driveId)) {
            try {
              const buf = await storage.download(driveId);
              if (buf && buf.length > 0) {
                flyers.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
              }
            } catch (dlErr) {
              console.warn(`[Broadcast Telegram] Gagal download file flyer ${driveId}:`, dlErr);
            }
          }
        }
      }
    }

    const sCode = pkg.startingPoint?.code || pkg.parentKeberangkatan?.startingPoint?.code || undefined;
    const sName = pkg.startingPoint?.name || pkg.parentKeberangkatan?.startingPoint?.name || undefined;
    const customCaption = body.caption || pkg.caption || "";

    const broadcastRes = await sendPackageBroadcast({
      packages: [pkg],
      kodeGrup: pkg.paketGrup?.kodeGrup || pkg.kode,
      flyerBase64List: flyers,
      startingPointCode: sCode,
      startingPointName: sName,
      customCaption,
    });

    if (!broadcastRes.success) {
      return NextResponse.json(
        {
          success: false,
          message: broadcastRes.message || "Gagal mengirim broadcast ke Telegram",
        },
        { status: 400 }
      );
    }

    // Save broadcast audit metadata into driveFolderIds.telegramBroadcast (ADR-0026)
    const currentMeta = (pkg.driveFolderIds as any) || {};
    const broadcastRecord = {
      isBroadcasted: true,
      broadcastedAt: new Date().toISOString(),
      broadcastedBy: session.user.name || session.user.email || "Admin",
      targetGroup: broadcastRes.targetGroup,
      flyerMessageId: broadcastRes.flyerMessageId,
      replyMessageId: broadcastRes.replyMessageId,
      flyerCount: flyers.length,
    };

    await prisma.keberangkatan.update({
      where: { id: pkg.id },
      data: {
        driveFolderIds: {
          ...currentMeta,
          telegramBroadcast: broadcastRecord,
        },
        // If user submitted new caption during broadcast, persist it too
        ...(customCaption ? { caption: customCaption } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Paket berhasil dibroadcast ke grup Telegram ${broadcastRes.targetGroup || "operasional"}!`,
      data: broadcastRecord,
    });
  } catch (error: any) {
    console.error("[POST /api/keberangkatan/[id]/broadcast-telegram] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
