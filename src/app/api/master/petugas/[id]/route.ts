import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db";
import { getStorageAdapter } from "@/server/storage";

const TOUR_LEADER_DRIVE_FOLDER_ID = "184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G";

function parseDateOrNull(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function sanitizeName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

// PUT: Edit petugas (termasuk isActive, dokumen, dan data paspor)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const existing = await prisma.masterPetugas.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Petugas tidak ditemukan" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    const updateData: Record<string, any> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      if (formData.has("nama")) updateData.nama = formData.get("nama") as string;
      if (formData.has("tipe")) updateData.tipe = formData.get("tipe") as string;
      if (formData.has("noHp")) updateData.noHp = (formData.get("noHp") as string) || null;
      if (formData.has("kode")) updateData.kode = (formData.get("kode") as string) || null;
      if (formData.has("isActive")) updateData.isActive = formData.get("isActive") !== "false";
      if (formData.has("nomorPaspor")) updateData.nomorPaspor = (formData.get("nomorPaspor") as string) || null;
      if (formData.has("tglDikeluarkan")) updateData.tglDikeluarkan = parseDateOrNull(formData.get("tglDikeluarkan"));
      if (formData.has("tglHabis")) updateData.tglHabis = parseDateOrNull(formData.get("tglHabis"));
      if (formData.has("kotaPaspor")) updateData.kotaPaspor = (formData.get("kotaPaspor") as string) || null;
      if (formData.has("nik")) updateData.nik = (formData.get("nik") as string) || null;
      if (formData.has("tempatLahir")) updateData.tempatLahir = (formData.get("tempatLahir") as string) || null;
      if (formData.has("tanggalLahir")) updateData.tanggalLahir = parseDateOrNull(formData.get("tanggalLahir"));
      if (formData.has("jenisKelamin")) updateData.jenisKelamin = (formData.get("jenisKelamin") as string) || null;

      const pasporFile = formData.get("paspor") as File | null;
      const fotoFile = formData.get("foto") as File | null;

      const storage = getStorageAdapter();
      const currentName = updateData.nama || existing.nama;

      if (pasporFile && pasporFile.size > 0) {
        const ext = pasporFile.name.split(".").pop() || "jpg";
        const cleanName = sanitizeName(currentName);
        const cleanNoPaspor = sanitizeName(updateData.nomorPaspor || existing.nomorPaspor || "PASPOR");
        const fileName = `PASPOR_TL_${cleanName}_${cleanNoPaspor}.${ext}`;
        const buffer = Buffer.from(await pasporFile.arrayBuffer());
        const fileId = await storage.upload(fileName, buffer, pasporFile.type || "image/jpeg", TOUR_LEADER_DRIVE_FOLDER_ID);
        updateData.pasporDriveId = fileId;
        updateData.pasporUrl = await storage.getUrl(fileId);
      }

      if (fotoFile && fotoFile.size > 0) {
        const ext = fotoFile.name.split(".").pop() || "jpg";
        const cleanName = sanitizeName(currentName);
        const fileName = `FOTO_TL_${cleanName}_${Date.now()}.${ext}`;
        const buffer = Buffer.from(await fotoFile.arrayBuffer());
        const fileId = await storage.upload(fileName, buffer, fotoFile.type || "image/jpeg", TOUR_LEADER_DRIVE_FOLDER_ID);
        updateData.fotoDriveId = fileId;
        updateData.fotoUrl = await storage.getUrl(fileId);
      }
    } else {
      const body = await request.json();
      if (body.nama !== undefined) updateData.nama = body.nama;
      if (body.tipe !== undefined) updateData.tipe = body.tipe;
      if (body.noHp !== undefined) updateData.noHp = body.noHp || null;
      if (body.kode !== undefined) updateData.kode = body.kode || null;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.nomorPaspor !== undefined) updateData.nomorPaspor = body.nomorPaspor || null;
      if (body.tglDikeluarkan !== undefined) updateData.tglDikeluarkan = parseDateOrNull(body.tglDikeluarkan);
      if (body.tglHabis !== undefined) updateData.tglHabis = parseDateOrNull(body.tglHabis);
      if (body.kotaPaspor !== undefined) updateData.kotaPaspor = body.kotaPaspor || null;
      if (body.nik !== undefined) updateData.nik = body.nik || null;
      if (body.tempatLahir !== undefined) updateData.tempatLahir = body.tempatLahir || null;
      if (body.tanggalLahir !== undefined) updateData.tanggalLahir = parseDateOrNull(body.tanggalLahir);
      if (body.jenisKelamin !== undefined) updateData.jenisKelamin = body.jenisKelamin || null;
      if (body.pasporUrl !== undefined) updateData.pasporUrl = body.pasporUrl || null;
      if (body.pasporDriveId !== undefined) updateData.pasporDriveId = body.pasporDriveId || null;
      if (body.fotoUrl !== undefined) updateData.fotoUrl = body.fotoUrl || null;
      if (body.fotoDriveId !== undefined) updateData.fotoDriveId = body.fotoDriveId || null;
    }

    const data = await prisma.masterPetugas.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(`[PUT /api/master/petugas/${params.id} Error]:`, error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Soft/Hard delete petugas
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    // Hard delete
    await prisma.masterPetugas.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Petugas deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
