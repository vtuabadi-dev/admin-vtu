import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo, pembayaranRepo } from "@/server/repositories";
import { getStorageAdapter } from "@/server/storage";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";
import { prisma } from "@/server/db/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

// GET /api/jamaah/me/payments — payment history
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const jamaah = await jamaahRepo.findByUserId(session.user.id);
  if (!jamaah) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  const payments = await pembayaranRepo.findByGroup(jamaah.groupId);
  return NextResponse.json({ success: true, data: payments });
}

// POST /api/jamaah/me/payments — submit payment with proof upload
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rlKey = rateLimitKey(request);
  const rl = checkRateLimit(rlKey, getRateLimitConfig("upload"));
  if (!rl.allowed) {
    return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
  }

  const jamaahRecord = await prisma.jamaah.findFirst({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          keberangkatan: true,
        },
      },
    },
  });

  if (!jamaahRecord) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const jumlahStr = formData.get("jumlah") as string;
    const bankPengirim = formData.get("bankPengirim") as string;
    const nomorRekening = formData.get("nomorRekening") as string;
    const catatan = formData.get("catatan") as string | null;
    const file = formData.get("file") as File | null;

    if (!jumlahStr || !bankPengirim) {
      return NextResponse.json({ success: false, message: "Jumlah dan bank pengirim wajib diisi" }, { status: 400 });
    }

    const jumlah = parseInt(jumlahStr, 10);
    if (isNaN(jumlah) || jumlah <= 0) {
      return NextResponse.json({ success: false, message: "Jumlah tidak valid" }, { status: 400 });
    }

    let buktiUrl: string | undefined;

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, message: "Ukuran file maksimal 5MB" }, { status: 400 });
      }

      const rawExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "jpg" : "jpg";
      const ext = `.${rawExt}`;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json({ success: false, message: "Format file tidak didukung (JPG, PNG, PDF)" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const driveFolders = (jamaahRecord.group?.keberangkatan?.driveFolderIds as any) || {};

      const manifestRow = await prisma.manifestRow.findFirst({
        where: { jamaahId: jamaahRecord.id },
        select: { nomorUrut: true },
      });
      const nomorManifest = String(manifestRow?.nomorUrut || "000").padStart(3, "0");
      const cleanName = jamaahRecord.namaLengkap.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
      const formattedFileName = `${nomorManifest}-${jamaahRecord.registrationId}_${cleanName}_bukti_${Date.now()}.${rawExt}`;

      const storage = getStorageAdapter();
      const fileId = await storage.upload(formattedFileName, buffer, file.type || "image/jpeg", driveFolders.pembayaran);
      buktiUrl = await storage.getUrl(fileId);
    }

    const payment = await pembayaranRepo.create({
      groupId: jamaahRecord.groupId,
      jumlah,
      metode: "transfer",
      tanggal: new Date().toISOString(),
      buktiUrl,
      status: "pending",
      sumber: "jamaah",
      bankPengirim: bankPengirim || undefined,
      nomorRekening: nomorRekening || undefined,
      catatan: catatan || undefined,
      alokasi: [{
        jamaahId: jamaahRecord.id,
        namaJamaah: jamaahRecord.namaLengkap,
        jumlah,
      }],
    } as any);

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
