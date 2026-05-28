import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo } from "@/server/repositories";

// GET /api/jamaah/me — current jamaah's profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const jamaah = await jamaahRepo.findByUserId(session.user.id);
  if (!jamaah) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: jamaah });
}

// PUT /api/jamaah/me — update own biodata
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const jamaah = await jamaahRepo.findByUserId(session.user.id);
  if (!jamaah) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const allowedFields: (keyof typeof jamaah)[] = [
      "namaLengkap", "namaAyah", "jenisKelamin", "tempatLahir", "tanggalLahir",
      "nik", "nomorPaspor", "masaBerlakuPaspor", "nomorTelepon", "email",
      "alamat", "provinsi", "kota", "kecamatan", "kelurahan",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    const updated = await jamaahRepo.update(jamaah.id, updateData as any);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
