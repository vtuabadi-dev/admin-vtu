import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import {
  getGlobalReminderSettings,
  updateGlobalReminderSettings,
} from "@/server/services/reminder-settings.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getGlobalReminderSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
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

  const perm = checkServerPermission(session, "pembayaran", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const body = await request.json();

    const updated = await updateGlobalReminderSettings(
      {
        globalDeadlineDays: body.globalDeadlineDays,
        stages: body.stages,
      },
      session.user.name || session.user.email || "admin"
    );

    // Save Notification Log Entry to Database (Audit Trail)
    try {
      await prisma.auditEntry.create({
        data: {
          userId: session.user.id || "admin",
          userName: session.user.name || session.user.email || "Admin Pembayaran",
          role: (session.user.role as any) || "super_admin",
          module: "pembayaran",
          action: "UPDATE_REMINDER_SETTINGS",
          detail: `Konfigurasi deadline resmi H-${body.globalDeadlineDays || 40} & ${body.stages?.length || 0} tahapan reminder berhasil disimpan ke Database`,
          after: JSON.stringify({
            globalDeadlineDays: body.globalDeadlineDays,
            stagesCount: body.stages?.length,
            updatedAt: updated.updatedAt,
          }),
        },
      });
    } catch (dbErr) {
      console.warn("[AuditTrail DB Notice]:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Konfigurasi tahapan reminder berhasil disimpan ke database!",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
