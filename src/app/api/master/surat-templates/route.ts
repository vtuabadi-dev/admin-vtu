import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { DEFAULT_SURAT_TEMPLATES } from "@/shared/lib/surat-autocrat-engine";
import type { SuratTemplate } from "@/shared/types/surat";

// In-memory runtime cache for server-side persistence
let serverCustomTemplates: SuratTemplate[] = [...DEFAULT_SURAT_TEMPLATES];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: serverCustomTemplates,
      total: serverCustomTemplates.length,
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

    serverCustomTemplates = [newTemplate, ...serverCustomTemplates.filter((t) => t.id !== newTemplate.id)];

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil disimpan",
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

    const index = serverCustomTemplates.findIndex((t) => t.id === body.id);
    const updatedTemplate: SuratTemplate = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      serverCustomTemplates[index] = updatedTemplate;
    } else {
      serverCustomTemplates.push(updatedTemplate);
    }

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil diperbarui",
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

    serverCustomTemplates = serverCustomTemplates.filter((t) => t.id !== id);

    return NextResponse.json({
      success: true,
      message: "Template surat berhasil dihapus",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
