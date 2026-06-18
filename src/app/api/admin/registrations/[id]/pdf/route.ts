import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { registrationRepo } from "@/server/repositories";
import { getStorageAdapter } from "@/server/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const reg = await registrationRepo.findById(params.id);
  if (!reg) return NextResponse.json({ success: false, message: "Registrasi tidak ditemukan" }, { status: 404 });

  const pdfPath = `registrations/${reg.kodeRegistrasi}/formulir-pendaftaran.pdf`;

  try {
    const storage = getStorageAdapter();
    const buffer = await storage.download(pdfPath);
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Formulir-${reg.kodeRegistrasi}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "PDF belum tersedia. Silakan coba beberapa saat lagi." }, { status: 404 });
  }
}
