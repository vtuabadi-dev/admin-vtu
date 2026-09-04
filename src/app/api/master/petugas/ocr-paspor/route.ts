import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { processDocument } from "@/server/services/ocr.service";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File paspor wajib disertakan" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Jalankan engine OCR paspor yang sudah ada di VTU
    const ocrResult = await processDocument(buffer, "paspor", 0);

    if (!ocrResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: ocrResult.rawText || "Gagal mengekstrak data dari paspor",
          rawText: ocrResult.rawText,
        },
        { status: 422 }
      );
    }

    // Mapping hasil ekstraksi OCR
    const fieldMap: Record<string, string> = {};
    for (const f of ocrResult.fields) {
      if (f.value) {
        fieldMap[f.field] = f.value;
      }
    }

    // Normalisasi jenis kelamin
    let jk = fieldMap.jenisKelamin?.toUpperCase();
    if (jk === "M" || jk === "LAKI-LAKI" || jk === "PRIA") jk = "L";
    if (jk === "F" || jk === "PEREMPUAN" || jk === "WANITA") jk = "P";
    if (jk !== "L" && jk !== "P") jk = undefined;

    const extractedData = {
      nomorPaspor: fieldMap.nomorPaspor || "",
      namaLengkap: fieldMap.namaLengkap || "",
      tempatTerbitPaspor: fieldMap.tempatTerbitPaspor || "",
      tanggalTerbitPaspor: fieldMap.tanggalTerbitPaspor || "",
      tanggalKadaluarsa: fieldMap.tanggalKadaluarsa || "",
      tempatLahir: fieldMap.tempatLahir || "",
      tanggalLahir: fieldMap.tanggalLahir || "",
      jenisKelamin: jk || "",
      nik: fieldMap.nik || "",
      confidence: ocrResult.overallConfidence,
      rawText: ocrResult.rawText,
    };

    return NextResponse.json({
      success: true,
      message: "Berhasil mengekstrak data paspor",
      data: extractedData,
    });
  } catch (error: any) {
    console.error("[OCR Paspor Petugas Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan sistem saat proses OCR" },
      { status: 500 }
    );
  }
}
