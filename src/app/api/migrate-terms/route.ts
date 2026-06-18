import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

// Temporary migration endpoint — hit once then delete
export async function GET() {
  const results: string[] = [];

  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
          CREATE TYPE "DocumentType" AS ENUM ('TERMS_CONDITIONS', 'PAYMENT_POLICY', 'CANCELLATION_POLICY', 'REFUND_POLICY', 'PDF_TEMPLATE', 'EMAIL_TEMPLATE', 'WHATSAPP_TEMPLATE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
          CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
        END IF;
      END $$;
    `);
    results.push("Enums OK");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "operational_documents" (
        "id" TEXT PRIMARY KEY,
        "type" "DocumentType" NOT NULL,
        "title" TEXT NOT NULL,
        "version" TEXT NOT NULL,
        "content" TEXT NOT NULL DEFAULT '',
        "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
        "effectiveDate" TIMESTAMP(3),
        "createdBy" TEXT,
        "updatedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "operational_documents_type_version_key" UNIQUE ("type", "version")
      );
      CREATE INDEX IF NOT EXISTS "operational_documents_type_status_idx" ON "operational_documents" ("type", "status");
    `);
    results.push("Table OK");

    const existing = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM operational_documents WHERE type = 'TERMS_CONDITIONS'`) as any;
    if (Number(existing[0].cnt) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO operational_documents ("id", "type", "title", "version", "content", "status", "effectiveDate", "createdBy", "createdAt", "updatedAt")
        VALUES ('seed-terms-v1', 'TERMS_CONDITIONS', 'Syarat & Ketentuan Pendaftaran Umroh', '1.0', $1, 'ACTIVE', NOW(), 'system', NOW(), NOW())
      `, `<h3>Syarat & Ketentuan Pendaftaran Umroh</h3><ol><li>Pendaftar adalah perwakilan resmi rombongan.</li><li>Data jamaah harus sesuai dokumen resmi.</li><li>Minimal 1 orang, maksimal 100 orang per pendaftaran.</li><li>Biaya belum termasuk upgrade hotel dan tambahan lain.</li><li>DP minimal 30% dilunasi dalam 14 hari.</li><li>Pembatalan sepihak dikenakan biaya administrasi.</li><li>Dokumen wajib: Paspor, Pas Foto, Vaksin, KTP.</li><li>Travel berhak menolak data tidak lengkap.</li><li>Tanda tangan digital = persetujuan sah.</li><li>Data diproses sesuai kebijakan privasi.</li></ol>`);
      results.push("Seed OK");
    } else {
      results.push("Seed skipped (exists)");
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, results }, { status: 500 });
  }
}
