import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleDriveAdapter,
  createKeuanganExpenseFolderHierarchy,
  isGoogleDriveConfigured,
} from "@/server/storage/google-drive";

function formatIndonesianDateString(dateInput?: string): string {
  if (!dateInput) return "UMUM";
  try {
    // If input is already formatted (e.g. "17 JUNI 2026")
    if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(dateInput.trim())) {
      return dateInput.trim().toUpperCase();
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput.replace(/[/\\:*?"<>|]/g, "-").toUpperCase().trim();
    
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
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
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    const monthName = monthNames[validDate.getMonth()] || "JANUARI";
    return `${monthNum} - ${monthName} ${year}`;
  } catch {
    return "01 - JANUARI 2026";
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Drive belum dikonfigurasi. Hubungkan Google Cloud OAuth untuk mengaktifkan sinkronisasi vault.",
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docTypeRaw = formData.get("docType") as string | null; // "invoice" | "transfer_proof"
    const category = ((formData.get("category") as string) || "Operasional").toUpperCase().trim();
    const departureDate = formData.get("departureDate") as string | null;
    const packageNameRaw = formData.get("packageName") as string | null;
    const transactionDate = formData.get("transactionDate") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File bukti tidak ditemukan dalam permintaan" },
        { status: 400 }
      );
    }

    const docType: "invoice" | "transfer_proof" =
      docTypeRaw === "transfer_proof" || docTypeRaw === "transfer" || docTypeRaw === "tf"
        ? "transfer_proof"
        : "invoice";

    // 1. Resolve Hierarchy Folder Variables
    const isPaketLinked = Boolean(departureDate && packageNameRaw && packageNameRaw !== "Operasional Umum" && packageNameRaw !== "OPERASIONAL UMUM");
    const refDate = isPaketLinked ? (departureDate || transactionDate || new Date().toISOString().slice(0, 10)) : (transactionDate || new Date().toISOString().slice(0, 10));
    const parsedDate = new Date(refDate);
    const year = isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();
    const monthFolderName = resolveMonthFolderName(refDate);
    const packageName = isPaketLinked
      ? (packageNameRaw || "PAKET").replace(/[/\\:*?"<>|]/g, " ").trim().toUpperCase()
      : undefined;

    // 2. Build or Retrieve Google Drive Folder Hierarchy
    // Root ID: 1HHj6X5Zsu_t8Nwp676kmDDfy7uEGf0pb -> [TAHUN] -> [WAIT LABEL atau BULAN/PAKET] -> [BUKTI INVOICE / BUKTI TF]
    const { targetFolderId, isWaitLabel } = await createKeuanganExpenseFolderHierarchy(
      year,
      isPaketLinked ? monthFolderName : undefined,
      packageName,
      docType
    );

    // 3. Resolve File Extension & Rename Format
    // Format:
    // Jika ada paket: BUKTI TF-[KATEGORI]-[TGGL KEBERANGKATAN PAKET].[ext]
    // Jika di WAIT LABEL: BUKTI TF-[KATEGORI]-[TGGL TRANSAKSI].[ext]
    const originalName = file.name || "file.jpg";
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch && extMatch[1] ? `.${extMatch[1].toLowerCase()}` : ".jpg";

    const formattedDate = formatIndonesianDateString(isPaketLinked ? departureDate || undefined : transactionDate || undefined);
    const cleanCategory = category.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();

    let renamedFileName: string;
    if (docType === "transfer_proof") {
      renamedFileName = `BUKTI TF-${cleanCategory}-${formattedDate}${ext}`;
    } else {
      renamedFileName = `INVOICE TAGIHAN-${cleanCategory}-${formattedDate}${ext}`;
    }

    // 4. Upload File Buffer to Target Subfolder in Google Drive
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "image/jpeg";

    const adapter = createGoogleDriveAdapter();
    const driveUrl = await adapter.upload(renamedFileName, buffer, contentType, targetFolderId);

    // 5. Extract File ID from driveUrl if available
    let fileId: string | undefined = undefined;
    if (driveUrl.includes("id=")) {
      fileId = driveUrl.split("id=")[1]?.split("&")[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: renamedFileName,
        url: driveUrl,
        fileId: fileId,
        targetFolderId,
        isWaitLabel,
        docType,
        category: cleanCategory,
      },
    });
  } catch (err: any) {
    console.error("[API Keuangan Upload Drive Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Gagal mengunggah file bukti ke Google Drive",
      },
      { status: 500 }
    );
  }
}
