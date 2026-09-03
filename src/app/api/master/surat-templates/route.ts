import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { DEFAULT_SURAT_TEMPLATES } from "@/shared/lib/surat-autocrat-engine";
import type { SuratTemplate } from "@/shared/types/surat";

export const dynamic = "force-dynamic";

// In-memory runtime cache with Supabase PostgreSQL fallback
let cachedSuratTemplates: SuratTemplate[] | null = null;

async function getSuratTemplatesFromDb(): Promise<SuratTemplate[]> {
  if (cachedSuratTemplates) return cachedSuratTemplates;

  try {
    const latestDbRecord = await prisma.auditEntry.findFirst({
      where: { action: "UPDATE_SURAT_TEMPLATES" },
      orderBy: { timestamp: "desc" },
    });

    if (latestDbRecord?.after) {
      const parsed = JSON.parse(latestDbRecord.after);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedSuratTemplates = parsed;
        return cachedSuratTemplates!;
      }
    }
  } catch (err) {
    console.warn("[SuratTemplates] Error reading from Supabase DB:", err);
  }

  cachedSuratTemplates = [...DEFAULT_SURAT_TEMPLATES];
  return cachedSuratTemplates;
}

async function saveSuratTemplatesToDb(templates: SuratTemplate[], userName: string): Promise<void> {
  cachedSuratTemplates = templates;
  try {
    await prisma.auditEntry.create({
      data: {
        userId: "admin-settings",
        userName,
        role: "super_admin",
        module: "dokumen",
        action: "UPDATE_SURAT_TEMPLATES",
        detail: `Template surat (${templates.length} template) berhasil disimpan di Supabase Database`,
        after: JSON.stringify(templates),
      },
    });
  } catch (err) {
    console.error("[SuratTemplates] Failed to save templates to Supabase DB:", err);
  }
}

export async function GET() {
  try {
    const templates = await getSuratTemplatesFromDb();
    return NextResponse.json({
      success: true,
      data: templates,
      total: templates.length,
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
    const body = (await request.json()) as Partial<SuratTemplate>;
    if (!body.nama || !body.templateContent) {
      return NextResponse.json({ success: false, message: "Nama template dan isi konten surat wajib diisi" }, { status: 400 });
    }

    const currentTemplates = await getSuratTemplatesFromDb();

    const newTemplate: SuratTemplate = {
      id: body.id || `tpl-custom-${Date.now()}`,
      slug: body.slug || body.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      nama: body.nama,
      kategori: body.kategori || "custom",
      deskripsi: body.deskripsi || "Template surat kustom",
      kodeNomorDefault: body.kodeNomorDefault || "SK-CUSTOM",
      perihalDefault: body.perihalDefault || body.nama,
      kopSuratType: body.kopSuratType || "ppiu_vtu",
      lampiranDefault: body.lampiranDefault || "-",
      tujuanDefault: body.tujuanDefault || "Kepada Pihak yang Berkepentingan",
      kotaTujuanDefault: body.kotaTujuanDefault || "Di Tempat",
      penandatangan: body.penandatangan || {
        nama: "H. Fauzan Adzim, S.E.",
        jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
        showStempel: true,
        showBarcode: true,
      },
      templateContent: body.templateContent,
      placeholders: body.placeholders || [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [newTemplate, ...currentTemplates.filter((t) => t.id !== newTemplate.id)];
    await saveSuratTemplatesToDb(updatedList, session.user.name || session.user.email || "admin");

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil disimpan ke Supabase database",
      data: newTemplate,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = (await request.json()) as SuratTemplate;
    if (!body.id) {
      return NextResponse.json({ success: false, message: "Template ID required" }, { status: 400 });
    }

    const currentTemplates = await getSuratTemplatesFromDb();
    const index = currentTemplates.findIndex((t) => t.id === body.id);
    const updatedTemplate: SuratTemplate = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    let updatedList = [...currentTemplates];
    if (index >= 0) {
      updatedList[index] = updatedTemplate;
    } else {
      updatedList.push(updatedTemplate);
    }

    await saveSuratTemplatesToDb(updatedList, session.user.name || session.user.email || "admin");

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil diperbarui di Supabase database",
      data: updatedTemplate,
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
    if (!id) return NextResponse.json({ success: false, message: "Template ID required" }, { status: 400 });

    const currentTemplates = await getSuratTemplatesFromDb();
    const updatedList = currentTemplates.filter((t) => t.id !== id);

    await saveSuratTemplatesToDb(updatedList, session.user.name || session.user.email || "admin");

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil dihapus dari Supabase database",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
