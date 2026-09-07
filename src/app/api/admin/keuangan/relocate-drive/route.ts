import { NextRequest, NextResponse } from "next/server";
import {
  createKeuanganExpenseFolderHierarchy,
  isGoogleDriveConfigured,
  moveAndRenameDriveFile,
} from "@/server/storage/google-drive";

function formatIndonesianDateString(dateInput?: string): string {
  if (!dateInput) return "UMUM";
  try {
    if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(dateInput.trim())) {
      return dateInput.trim().toUpperCase();
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput.replace(/[/\\:*?"<>|]/g, "-").toUpperCase().trim();

    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
    ];
    const monthName = monthNames[d.getMonth()] || "JANUARI";
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  } catch {
    return dateInput.replace(/[/\\:*?"<>|]/g, "-").toUpperCase().trim();
  }
}

function resolveMonthFolderName(dateInput?: string): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const year = validDate.getFullYear();
    const monthNum = String(validDate.getMonth() + 1).padStart(2, "0");
    const monthNames = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
    ];
    const monthName = monthNames[validDate.getMonth()] || "JANUARI";
    return `${monthNum} - ${monthName} ${year}`;
  } catch {
    return "01 - JANUARI 2026";
  }
}

function getFileExtension(urlOrName?: string): string {
  if (!urlOrName) return ".jpg";
  const match = urlOrName.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return match && match[1] ? `.${match[1].toLowerCase()}` : ".jpg";
}

export async function POST(req: NextRequest) {
  try {
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Drive belum dikonfigurasi.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      invoiceDriveUrl,
      transferProofDriveUrl,
      category = "Operasional",
      departureDate,
      packageName: packageNameRaw,
      transactionDate,
    } = body;

    // Relokasi hanya berjalan jika ada paket target yang valid
    if (!packageNameRaw || packageNameRaw === "Operasional Umum" || packageNameRaw === "OPERASIONAL UMUM") {
      return NextResponse.json({
        success: true,
        message: "Tidak ada paket target yang dipilih (tetap di WAIT LABEL)",
      });
    }

    const refDate = departureDate || transactionDate || new Date().toISOString().slice(0, 10);
    const parsedDate = new Date(refDate);
    const year = isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();
    const monthFolderName = resolveMonthFolderName(refDate);
    const packageName = packageNameRaw.replace(/[/\\:*?"<>|]/g, " ").trim().toUpperCase();

    // 1. Buat / Dapatkan folder Paket tujuan (BUKTI INVOICE & BUKTI TF)
    const { invoiceFolderId, transferFolderId } = await createKeuanganExpenseFolderHierarchy(
      year,
      monthFolderName,
      packageName,
      "invoice"
    );

    const formattedDate = formatIndonesianDateString(departureDate || transactionDate || undefined);
    const cleanCategory = String(category).replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();

    const results: {
      invoiceMoved?: boolean;
      invoiceNewName?: string;
      transferMoved?: boolean;
      transferNewName?: string;
    } = {};

    // 2. Relokasi Bukti Invoice jika ada
    if (invoiceDriveUrl && typeof invoiceDriveUrl === "string" && invoiceDriveUrl.trim() !== "") {
      const ext = getFileExtension(invoiceDriveUrl);
      const newInvoiceFileName = `INVOICE TAGIHAN-${cleanCategory}-${formattedDate}${ext}`;
      const moved = await moveAndRenameDriveFile(invoiceDriveUrl, invoiceFolderId, undefined, newInvoiceFileName);
      results.invoiceMoved = moved;
      results.invoiceNewName = newInvoiceFileName;
    }

    // 3. Relokasi Bukti Transfer jika ada
    if (transferProofDriveUrl && typeof transferProofDriveUrl === "string" && transferProofDriveUrl.trim() !== "") {
      const ext = getFileExtension(transferProofDriveUrl);
      const newTransferFileName = `BUKTI TF-${cleanCategory}-${formattedDate}${ext}`;
      const moved = await moveAndRenameDriveFile(transferProofDriveUrl, transferFolderId, undefined, newTransferFileName);
      results.transferMoved = moved;
      results.transferNewName = newTransferFileName;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    console.error("[API Keuangan Relocate Drive Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Gagal merelokasi file bukti di Google Drive",
      },
      { status: 500 }
    );
  }
}
