import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import type { GeneratedSuratLog } from "@/shared/types/surat";

export const dynamic = "force-dynamic";

// In-memory cache fallback for high-performance reading
let cachedGeneratedLogs: GeneratedSuratLog[] | null = null;

async function getGeneratedLogsFromDb(): Promise<GeneratedSuratLog[]> {
  if (cachedGeneratedLogs && cachedGeneratedLogs.length > 0) {
    return cachedGeneratedLogs;
  }

  try {
    const latestDbRecord = await prisma.auditEntry.findFirst({
      where: { action: "SAVE_GENERATED_SURAT_LOGS" },
      orderBy: { timestamp: "desc" },
    });

    if (latestDbRecord?.after) {
      const parsed = JSON.parse(latestDbRecord.after);
      if (Array.isArray(parsed)) {
        cachedGeneratedLogs = parsed;
        return cachedGeneratedLogs!;
      }
    }
  } catch (err) {
    console.warn("[SuratLogs] Error reading from Supabase DB:", err);
  }

  return cachedGeneratedLogs ?? [];
}

async function saveGeneratedLogsToDb(logs: GeneratedSuratLog[], userName: string): Promise<void> {
  cachedGeneratedLogs = logs;

  try {
    // Strip heavy base64 strings from audit log storage to keep DB payload light and fast
    const lightweightLogs = logs.map(({ templateFileBase64, ...rest }) => rest);

    await prisma.auditEntry.create({
      data: {
        userId: "admin-surat",
        userName,
        role: "super_admin",
        module: "dokumen",
        action: "SAVE_GENERATED_SURAT_LOGS",
        detail: `Riwayat surat (${logs.length} surat) berhasil disimpan di Supabase Database`,
        after: JSON.stringify(lightweightLogs.slice(0, 500)),
      },
    });
  } catch (err) {
    console.error("[SuratLogs] Failed to save logs to Supabase DB:", err);
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase();
    const template = searchParams.get("template");
    const packageId = searchParams.get("packageId");

    let logs = await getGeneratedLogsFromDb();

    if (q) {
      logs = logs.filter(
        (l) =>
          l.nomorSurat.toLowerCase().includes(q) ||
          l.jamaahNama.toLowerCase().includes(q) ||
          (l.jamaahPaspor && l.jamaahPaspor.toLowerCase().includes(q)) ||
          l.packageName.toLowerCase().includes(q) ||
          l.perihal.toLowerCase().includes(q)
      );
    }

    if (template && template !== "all") {
      logs = logs.filter((l) => l.templateSlug === template || l.templateId === template);
    }

    if (packageId && packageId !== "all") {
      logs = logs.filter((l) => l.packageId === packageId);
    }

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = (await request.json()) as GeneratedSuratLog;
    if (!body.nomorSurat || !body.templateName) {
      return NextResponse.json({ success: false, message: "Nomor surat dan template surat diperlukan" }, { status: 400 });
    }

    const currentLogs = await getGeneratedLogsFromDb();

    const newLog: GeneratedSuratLog = {
      ...body,
      id: body.id || `srt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdBy: session.user.name || session.user.email || "Admin Operasional",
      generatedDate: body.generatedDate || new Date().toISOString(),
      status: "aktif",
    };

    const updatedLogs = [newLog, ...currentLogs.filter((l) => l.id !== newLog.id)];
    await saveGeneratedLogsToDb(updatedLogs, session.user.name || session.user.email || "Admin Operasional");

    return NextResponse.json({
      success: true,
      message: "Surat berhasil dicatat ke riwayat Supabase",
      data: newLog,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "Surat ID required" }, { status: 400 });

    const currentLogs = await getGeneratedLogsFromDb();
    const updatedLogs = currentLogs.filter((l) => l.id !== id);
    await saveGeneratedLogsToDb(updatedLogs, session.user.name || session.user.email || "Admin Operasional");

    return NextResponse.json({
      success: true,
      message: "Riwayat surat berhasil dihapus dari Supabase",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
