import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db/client";
import { extractTransferSlip } from "@/server/services/ocr/transfer-slip-ocr.service";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "pembayaran", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const paymentId = decodeURIComponent(params.id);
    const payment = await prisma.pembayaran.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ success: false, message: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    if (!payment.buktiUrl) {
      return NextResponse.json({ success: false, message: "Tidak ada bukti transfer yang diunggah" }, { status: 400 });
    }

    const ocrResult = await extractTransferSlip(payment.buktiUrl, payment.id);

    return NextResponse.json({
      success: true,
      data: ocrResult,
      message: "OCR bukti transfer berhasil diproses",
    });
  } catch (error) {
    console.error("[api-pembayaran-ocr] Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
