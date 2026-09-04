import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getStorageAdapter } from "@/server/storage";
import {
  isGoogleDriveConfigured,
  getGoogleDriveInvoiceFolderId,
} from "@/server/storage/google-drive";

export async function POST(request: NextRequest) {
  const session = await auth();
  const perm = checkServerPermission(session, "pembayaran", "edit");
  if (!perm.allowed) {
    return NextResponse.json(
      { success: false, message: perm.reason || "Akses tidak diizinkan" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { paymentId, invoiceNumber, kodeRegistrasi, namaGroup, pdfBase64 } = body;

    if (!invoiceNumber || !pdfBase64) {
      return NextResponse.json(
        { success: false, message: "Parameter invoiceNumber dan pdfBase64 wajib diisi" },
        { status: 400 }
      );
    }

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: "Google Drive storage adapter belum terkonfigurasi pada server.",
        },
        { status: 503 }
      );
    }

    // Clean base64 string
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { success: false, message: "File PDF base64 tidak valid atau kosong" },
        { status: 400 }
      );
    }

    // Standardized file name: [NomorInvoice] - [KodeRegistrasi] - [NamaGroup].pdf
    const cleanInv = invoiceNumber.replace(/[/\\?%*:|"<>]/g, "-").trim();
    const cleanKode = (kodeRegistrasi || "REG").replace(/[/\\?%*:|"<>]/g, "-").trim();
    const cleanGrp = (namaGroup || "Jamaah").replace(/[/\\?%*:|"<>]/g, "-").trim();
    const fileName = `Invoice-${cleanInv} - ${cleanKode} - ${cleanGrp}.pdf`;

    const targetFolderId = getGoogleDriveInvoiceFolderId();
    const storage = getStorageAdapter();

    // Upload to centralized invoice folder in Google Drive
    const fileId = await storage.upload(fileName, pdfBuffer, "application/pdf", targetFolderId);

    if (!fileId) {
      throw new Error("Gagal mengunggah file invoice ke Google Drive.");
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Update database records
    if (paymentId) {
      await prisma.pembayaran.update({
        where: { id: paymentId },
        data: { invoiceDriveId: fileId },
      }).catch((err) => {
        console.warn("[upload-drive] Failed to update pembayaran.invoiceDriveId:", err);
      });
    }

    // Also update invoice table if exists
    try {
      await prisma.invoice.updateMany({
        where: {
          OR: [{ nomorInvoice: invoiceNumber }, { id: invoiceNumber }],
        },
        data: { invoiceDriveId: fileId },
      });
    } catch (invErr) {
      console.warn("[upload-drive] Notice: Failed updating invoice.invoiceDriveId:", invErr);
    }

    return NextResponse.json({
      success: true,
      fileId,
      downloadUrl,
      fileName,
      targetFolderId,
    });
  } catch (error: any) {
    console.error("[upload-drive] Error uploading invoice to Google Drive:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengunggah invoice ke Google Drive" },
      { status: 500 }
    );
  }
}
