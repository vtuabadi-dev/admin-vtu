import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import type { GeneratedSuratLog } from "@/shared/types/surat";

// In-memory runtime cache for server-side generated letters logs
let serverGeneratedLogs: GeneratedSuratLog[] = [];

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

    let logs = [...serverGeneratedLogs];

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

    const newLog: GeneratedSuratLog = {
      ...body,
      id: body.id || `srt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdBy: session.user.name || session.user.email || "Admin Operasional",
      generatedDate: body.generatedDate || new Date().toISOString(),
      status: "aktif",
    };

    serverGeneratedLogs = [newLog, ...serverGeneratedLogs.filter((l) => l.id !== newLog.id)].slice(0, 1000);

    return NextResponse.json({
      success: true,
      message: "Surat berhasil dicatat ke riwayat",
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

    serverGeneratedLogs = serverGeneratedLogs.filter((l) => l.id !== id);

    return NextResponse.json({
      success: true,
      message: "Riwayat surat berhasil dihapus",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
