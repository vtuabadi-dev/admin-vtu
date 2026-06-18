import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { operationalDocumentRepo } from "@/server/repositories/operational-document.repository";

// Public endpoint — returns the active version of a document type
// Used by the registration portal to display dynamic Terms & Conditions
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");

  if (!type) {
    return NextResponse.json({ success: false, message: "Query parameter 'type' wajib diisi" }, { status: 400 });
  }

  const doc = await operationalDocumentRepo.findActiveByType(type);

  if (!doc) {
    return NextResponse.json({
      success: true,
      data: null,
      message: "Belum ada dokumen aktif untuk tipe ini",
    });
  }

  return NextResponse.json({ success: true, data: doc });
}
