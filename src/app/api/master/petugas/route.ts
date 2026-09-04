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

// GET: Ambil daftar petugas berdasarkan tipe
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipe = searchParams.get("tipe"); // TOUR_LEADER atau MUTHOWIF
  const search = searchParams.get("search") || "";

  try {
    const data = await prisma.masterPetugas.findMany({
      where: {
        ...(tipe ? { tipe } : {}),
        ...(search ? { nama: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Tambah petugas baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const contentType = request.headers.get("content-type") || "";
    let nama = "";
    let tipe = "";
    let noHp: string | null = null;
    let kode: string | null = null;
    let isActive = true;
    let nomorPaspor: string | null = null;
    let tglDikeluarkan: Date | null = null;
    let tglHabis: Date | null = null;
    let kotaPaspor: string | null = null;
    let nik: string | null = null;
    let tempatLahir: string | null = null;
    let tanggalLahir: Date | null = null;
    let jenisKelamin: string | null = null;
    let pasporUrl: string | null = null;
    let pasporDriveId: string | null = null;
    let fotoUrl: string | null = null;
    let fotoDriveId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      nama = (formData.get("nama") as string) || "";
      tipe = (formData.get("tipe") as string) || "TOUR_LEADER";
      noHp = (formData.get("noHp") as string) || null;
      kode = (formData.get("kode") as string) || null;
      isActive = formData.get("isActive") !== "false";
      nomorPaspor = (formData.get("nomorPaspor") as string) || null;
      tglDikeluarkan = parseDateOrNull(formData.get("tglDikeluarkan"));
      tglHabis = parseDateOrNull(formData.get("tglHabis"));
      kotaPaspor = (formData.get("kotaPaspor") as string) || null;
      nik = (formData.get("nik") as string) || null;
      tempatLahir = (formData.get("tempatLahir") as string) || null;
      tanggalLahir = parseDateOrNull(formData.get("tanggalLahir"));
      jenisKelamin = (formData.get("jenisKelamin") as string) || null;

      const pasporFile = formData.get("paspor") as File | null;
      const fotoFile = formData.get("foto") as File | null;

      const storage = getStorageAdapter();

      if (pasporFile && pasporFile.size > 0) {
        const ext = pasporFile.name.split(".").pop() || "jpg";
        const cleanName = sanitizeName(nama);
        const cleanNoPaspor = sanitizeName(nomorPaspor || "PASPOR");
        const fileName = `PASPOR_TL_${cleanName}_${cleanNoPaspor}.${ext}`;
        const buffer = Buffer.from(await pasporFile.arrayBuffer());
        const fileId = await storage.upload(fileName, buffer, pasporFile.type || "image/jpeg", TOUR_LEADER_DRIVE_FOLDER_ID);
        pasporDriveId = fileId;
        pasporUrl = await storage.getUrl(fileId);
      }

      if (fotoFile && fotoFile.size > 0) {
        const ext = fotoFile.name.split(".").pop() || "jpg";
        const cleanName = sanitizeName(nama);
        const fileName = `FOTO_TL_${cleanName}_${Date.now()}.${ext}`;
        const buffer = Buffer.from(await fotoFile.arrayBuffer());
        const fileId = await storage.upload(fileName, buffer, fotoFile.type || "image/jpeg", TOUR_LEADER_DRIVE_FOLDER_ID);
        fotoDriveId = fileId;
        fotoUrl = await storage.getUrl(fileId);
      }
    } else {
      const body = await request.json();
      nama = body.nama;
      tipe = body.tipe;
      noHp = body.noHp || null;
      kode = body.kode || null;
      isActive = body.isActive !== false;
      nomorPaspor = body.nomorPaspor || null;
      tglDikeluarkan = parseDateOrNull(body.tglDikeluarkan);
      tglHabis = parseDateOrNull(body.tglHabis);
      kotaPaspor = body.kotaPaspor || null;
      nik = body.nik || null;
      tempatLahir = body.tempatLahir || null;
      tanggalLahir = parseDateOrNull(body.tanggalLahir);
      jenisKelamin = body.jenisKelamin || null;
      pasporUrl = body.pasporUrl || null;
      pasporDriveId = body.pasporDriveId || null;
      fotoUrl = body.fotoUrl || null;
      fotoDriveId = body.fotoDriveId || null;
    }

    if (!nama || !tipe) {
      return NextResponse.json({ success: false, message: "Nama dan tipe petugas wajib diisi" }, { status: 400 });
    }

    const data = await prisma.masterPetugas.create({
      data: {
        nama,
        tipe,
        noHp,
        kode,
        isActive,
        pasporUrl,
        pasporDriveId,
        fotoUrl,
        fotoDriveId,
        nomorPaspor,
        tglDikeluarkan,
        tglHabis,
        kotaPaspor,
        nik,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[POST /api/master/petugas Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
