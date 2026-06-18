// Migration script: OperationalDocument table
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  console.log("Running operational_documents migration...");

  await p.$executeRawUnsafe(`
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
  console.log("  ✓ Enums checked/created");

  await p.$executeRawUnsafe(`
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
  `);
  console.log("  ✓ Table created/verified");

  // Seed default Terms & Conditions (v1.0)
  const existing = await p.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM operational_documents WHERE type = 'TERMS_CONDITIONS'`);
  if (Number((existing as any)[0].cnt) === 0) {
    await p.$executeRawUnsafe(`
      INSERT INTO operational_documents ("id", "type", "title", "version", "content", "status", "effectiveDate", "createdBy", "createdAt", "updatedAt")
      VALUES ($1, 'TERMS_CONDITIONS', 'Syarat & Ketentuan Pendaftaran Umroh', '1.0', $2, 'ACTIVE', NOW(), 'system', NOW(), NOW())
    `, "seed-terms-v1", `
<h3>Syarat & Ketentuan Pendaftaran Umroh</h3>
<ol>
<li><strong>Pendaftar</strong> adalah perwakilan resmi dari anggota rombongan yang didaftarkan.</li>
<li>Seluruh <strong>data jamaah</strong> yang didaftarkan harus benar dan sesuai dengan dokumen identitas resmi (KTP/Paspor).</li>
<li>Setiap rombongan minimal terdiri dari <strong>1 (satu) orang</strong> dan maksimal <strong>100 (seratus) orang</strong> per pendaftaran.</li>
<li>Biaya paket umroh yang tercantum <strong>belum termasuk</strong> biaya tambahan seperti upgrade hotel, perlengkapan, handling, dan administrasi.</li>
<li>Pembayaran <strong>DP minimal 30%</strong> dari total tagihan harus dilunasi dalam waktu 14 hari setelah pendaftaran disetujui.</li>
<li><strong>Pembatalan sepihak</strong> oleh jamaah setelah pendaftaran disetujui dapat dikenakan biaya administrasi sesuai kebijakan yang berlaku.</li>
<li>Dokumen yang wajib dilengkapi: <strong>Paspor</strong> (min. berlaku 6 bulan), <strong>Pas Foto 4x6</strong>, <strong>Kartu Vaksin Meningitis</strong>, dan <strong>KTP</strong>.</li>
<li>Pihak travel berhak <strong>menolak</strong> permohonan pendaftaran apabila data tidak lengkap atau tidak memenuhi syarat.</li>
<li>Tanda tangan digital yang diunggah merupakan bentuk <strong>persetujuan sah</strong> atas seluruh syarat dan ketentuan ini.</li>
<li>Dengan mendaftar, Anda menyetujui bahwa <strong>data Anda akan diproses</strong> sesuai dengan kebijakan privasi yang berlaku.</li>
</ol>
    `.trim());
    console.log("  ✓ Default Terms & Conditions v1.0 seeded (ACTIVE)");
  } else {
    console.log("  - Terms already exist, skipping seed");
  }

  await p.$disconnect();
  console.log("\nMigration complete!");
}

main().catch((e) => { console.error(e); process.exit(1); });
