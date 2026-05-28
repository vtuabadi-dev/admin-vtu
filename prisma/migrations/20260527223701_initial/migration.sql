-- CreateEnum
CREATE TYPE "OperationalRole" AS ENUM ('super_admin', 'admin_operasional', 'admin_pembayaran', 'admin_manifest', 'admin_dokumen', 'tour_leader', 'jamaah');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "DokumenJenis" AS ENUM ('paspor', 'pas_foto', 'vaksin', 'ktp', 'kk', 'akta');

-- CreateEnum
CREATE TYPE "StatusDokumen" AS ENUM ('lengkap', 'kurang', 'revisi', 'pending', 'processing', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "DokumenDataStatus" AS ENUM ('valid', 'pending', 'manual_edit', 'ocr_error');

-- CreateEnum
CREATE TYPE "DokumenFileStatus" AS ENUM ('valid', 'blurry', 'revisi', 'rejected');

-- CreateEnum
CREATE TYPE "StatusJamaah" AS ENUM ('registered', 'dokumen_upload', 'dokumen_verified', 'pembayaran_pending', 'lunas', 'ready', 'berangkat', 'batal');

-- CreateEnum
CREATE TYPE "StatusKeberangkatan" AS ENUM ('scheduled', 'preparing', 'ready', 'departed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "StatusPembayaran" AS ENUM ('draft', 'dp', 'cicilan', 'hampir_lunas', 'lunas', 'overdue');

-- CreateEnum
CREATE TYPE "TipeInvoice" AS ENUM ('dp', 'cicilan', 'pelunasan', 'tambahan');

-- CreateEnum
CREATE TYPE "StatusInvoice" AS ENUM ('unpaid', 'partial', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('transfer', 'cash', 'virtual_account', 'qris');

-- CreateEnum
CREATE TYPE "SumberPembayaran" AS ENUM ('admin', 'jamaah');

-- CreateEnum
CREATE TYPE "StatusItemInvoice" AS ENUM ('active', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "TipeKamar" AS ENUM ('single', 'double', 'triple', 'quad');

-- CreateEnum
CREATE TYPE "StatusManifest" AS ENUM ('draft', 'final', 'submitted');

-- CreateEnum
CREATE TYPE "StatusRooming" AS ENUM ('draft', 'final');

-- CreateEnum
CREATE TYPE "ReminderTipe" AS ENUM ('dokumen', 'pembayaran');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('sent', 'read', 'responded');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PembayaranVerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('dokumen', 'pembayaran', 'manifest', 'rooming', 'sistem', 'deadline', 'keberangkatan');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('dokumen', 'pembayaran', 'manifest', 'rooming', 'keberangkatan', 'jamaah', 'sistem');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACCOUNT_CREATED', 'ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "OperationalRole" NOT NULL DEFAULT 'jamaah',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keberangkatan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "namaPaket" TEXT NOT NULL,
    "hargaPaket" INTEGER NOT NULL,
    "tanggalBerangkat" TIMESTAMP(3) NOT NULL,
    "tanggalPulang" TIMESTAMP(3) NOT NULL,
    "maskapai" TEXT NOT NULL,
    "nomorPenerbangan" TEXT NOT NULL,
    "hotelMekkah" TEXT NOT NULL,
    "hotelMadinah" TEXT NOT NULL,
    "hotelOptions" JSONB NOT NULL,
    "status" "StatusKeberangkatan" NOT NULL DEFAULT 'scheduled',
    "kuota" INTEGER NOT NULL,
    "terisi" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keberangkatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_groups" (
    "id" TEXT NOT NULL,
    "kodeRegistrasi" TEXT NOT NULL,
    "namaGroup" TEXT NOT NULL,
    "ketuaGroupId" TEXT NOT NULL,
    "paketKeberangkatanId" TEXT NOT NULL,
    "jumlahAnggota" INTEGER NOT NULL,
    "totalTagihan" INTEGER NOT NULL,
    "totalPembayaran" INTEGER NOT NULL DEFAULT 0,
    "sisaPembayaran" INTEGER NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'active',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jamaah" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "nomorPeserta" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "namaAyah" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "nik" TEXT NOT NULL,
    "nomorPaspor" TEXT NOT NULL,
    "masaBerlakuPaspor" TIMESTAMP(3) NOT NULL,
    "nomorTelepon" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kelurahan" TEXT NOT NULL,
    "tandaTanganDigital" TEXT,
    "syaratDisetujui" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusJamaah" NOT NULL DEFAULT 'registered',
    "hotelMekkah" TEXT NOT NULL,
    "hotelMadinah" TEXT NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jamaah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "kodeRegistrasi" TEXT NOT NULL,
    "namaPerwakilan" TEXT NOT NULL,
    "nomorTelepon" TEXT NOT NULL,
    "emailPerwakilan" TEXT NOT NULL,
    "paxCount" INTEGER NOT NULL,
    "paketId" TEXT NOT NULL,
    "roomUpgrade" TEXT,
    "hotelUpgrade" TEXT,
    "signaturePath" TEXT NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "catatanAdmin" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_members" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "hubungan" TEXT,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "registration_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_items" (
    "id" TEXT NOT NULL,
    "jamaahId" TEXT NOT NULL,
    "jenis" "DokumenJenis" NOT NULL,
    "wajib" BOOLEAN NOT NULL,
    "status" "StatusDokumen" NOT NULL DEFAULT 'pending',
    "fileUrl" TEXT,
    "catatan" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "dataStatus" "DokumenDataStatus",
    "fileStatus" "DokumenFileStatus",
    "manualData" JSONB,
    "ocrData" JSONB,
    "ocrRetryCount" INTEGER NOT NULL DEFAULT 0,
    "qualityCheck" JSONB,
    "tenantId" TEXT,

    CONSTRAINT "dokumen_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "nomorInvoice" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "jamaahId" TEXT,
    "tipe" "TipeInvoice" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "sisaTagihan" INTEGER NOT NULL,
    "status" "StatusInvoice" NOT NULL DEFAULT 'unpaid',
    "jatuhTempo" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "hargaSatuan" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "status" "StatusItemInvoice" NOT NULL DEFAULT 'active',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_split_configs" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "splits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_split_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "jumlah" INTEGER NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "buktiUrl" TEXT,
    "status" "PembayaranVerificationStatus" NOT NULL DEFAULT 'pending',
    "sumber" "SumberPembayaran" NOT NULL DEFAULT 'admin',
    "verifiedBy" TEXT,
    "alasanReject" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "bankPengirim" TEXT,
    "nomorRekening" TEXT,
    "catatan" TEXT,
    "ocrData" JSONB,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alokasi_pembayaran" (
    "id" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "jamaahId" TEXT NOT NULL,
    "namaJamaah" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,

    CONSTRAINT "alokasi_pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifests" (
    "id" TEXT NOT NULL,
    "keberangkatanId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "namaManifest" TEXT NOT NULL,
    "templateId" TEXT,
    "hotelMekkah" TEXT,
    "hotelMadinah" TEXT,
    "status" "StatusManifest" NOT NULL DEFAULT 'draft',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifest_rows" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "nomorUrut" INTEGER NOT NULL,
    "jamaahId" TEXT NOT NULL,
    "nomorPaspor" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" TEXT NOT NULL,
    "nomorKursi" TEXT,
    "nomorKamar" TEXT,
    "catatan" TEXT,

    CONSTRAINT "manifest_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roomings" (
    "id" TEXT NOT NULL,
    "keberangkatanId" TEXT NOT NULL,
    "hotelMekkah" TEXT NOT NULL,
    "hotelMadinah" TEXT NOT NULL,
    "hotelNama" TEXT NOT NULL,
    "status" "StatusRooming" NOT NULL DEFAULT 'draft',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roomings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kamar" (
    "id" TEXT NOT NULL,
    "roomingId" TEXT NOT NULL,
    "nomorKamar" TEXT NOT NULL,
    "tipe" "TipeKamar" NOT NULL,
    "lantai" INTEGER NOT NULL,
    "mixLabel" TEXT,

    CONSTRAINT "kamar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penghuni_kamar" (
    "id" TEXT NOT NULL,
    "kamarId" TEXT NOT NULL,
    "jamaahId" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "isPasangan" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "penghuni_kamar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "jamaahId" TEXT,
    "invoiceId" TEXT,
    "tipe" "ReminderTipe" NOT NULL,
    "pesan" TEXT NOT NULL,
    "dikirimPada" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'sent',
    "tenantId" TEXT,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "role" "OperationalRole" NOT NULL,
    "module" "AuditModule" NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "tenantId" TEXT,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "keberangkatanId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "triggeredBy" TEXT,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_deadlines" (
    "id" TEXT NOT NULL,
    "keberangkatanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "warningDays" INTEGER NOT NULL,

    CONSTRAINT "auto_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "keberangkatan_kode_key" ON "keberangkatan"("kode");

-- CreateIndex
CREATE INDEX "keberangkatan_status_idx" ON "keberangkatan"("status");

-- CreateIndex
CREATE INDEX "keberangkatan_tanggalBerangkat_idx" ON "keberangkatan"("tanggalBerangkat");

-- CreateIndex
CREATE UNIQUE INDEX "registration_groups_kodeRegistrasi_key" ON "registration_groups"("kodeRegistrasi");

-- CreateIndex
CREATE INDEX "registration_groups_paketKeberangkatanId_idx" ON "registration_groups"("paketKeberangkatanId");

-- CreateIndex
CREATE INDEX "registration_groups_status_idx" ON "registration_groups"("status");

-- CreateIndex
CREATE UNIQUE INDEX "jamaah_registrationId_key" ON "jamaah"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "jamaah_nomorPeserta_key" ON "jamaah"("nomorPeserta");

-- CreateIndex
CREATE INDEX "jamaah_groupId_idx" ON "jamaah"("groupId");

-- CreateIndex
CREATE INDEX "jamaah_status_idx" ON "jamaah"("status");

-- CreateIndex
CREATE INDEX "jamaah_hotelMekkah_hotelMadinah_idx" ON "jamaah"("hotelMekkah", "hotelMadinah");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_kodeRegistrasi_key" ON "registration_requests"("kodeRegistrasi");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_paketId_idx" ON "registration_requests"("paketId");

-- CreateIndex
CREATE INDEX "registration_members_requestId_idx" ON "registration_members"("requestId");

-- CreateIndex
CREATE INDEX "dokumen_items_jamaahId_idx" ON "dokumen_items"("jamaahId");

-- CreateIndex
CREATE INDEX "dokumen_items_status_idx" ON "dokumen_items"("status");

-- CreateIndex
CREATE INDEX "dokumen_items_jenis_idx" ON "dokumen_items"("jenis");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_nomorInvoice_key" ON "invoices"("nomorInvoice");

-- CreateIndex
CREATE INDEX "invoices_groupId_idx" ON "invoices"("groupId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_jatuhTempo_idx" ON "invoices"("jatuhTempo");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_split_configs_groupId_key" ON "invoice_split_configs"("groupId");

-- CreateIndex
CREATE INDEX "pembayaran_groupId_idx" ON "pembayaran"("groupId");

-- CreateIndex
CREATE INDEX "pembayaran_status_idx" ON "pembayaran"("status");

-- CreateIndex
CREATE INDEX "pembayaran_invoiceId_idx" ON "pembayaran"("invoiceId");

-- CreateIndex
CREATE INDEX "alokasi_pembayaran_pembayaranId_idx" ON "alokasi_pembayaran"("pembayaranId");

-- CreateIndex
CREATE INDEX "alokasi_pembayaran_jamaahId_idx" ON "alokasi_pembayaran"("jamaahId");

-- CreateIndex
CREATE UNIQUE INDEX "manifests_kode_key" ON "manifests"("kode");

-- CreateIndex
CREATE INDEX "manifests_keberangkatanId_idx" ON "manifests"("keberangkatanId");

-- CreateIndex
CREATE INDEX "manifests_hotelMekkah_hotelMadinah_idx" ON "manifests"("hotelMekkah", "hotelMadinah");

-- CreateIndex
CREATE INDEX "manifests_status_idx" ON "manifests"("status");

-- CreateIndex
CREATE INDEX "manifest_rows_manifestId_idx" ON "manifest_rows"("manifestId");

-- CreateIndex
CREATE INDEX "manifest_rows_jamaahId_idx" ON "manifest_rows"("jamaahId");

-- CreateIndex
CREATE UNIQUE INDEX "manifest_rows_manifestId_nomorUrut_key" ON "manifest_rows"("manifestId", "nomorUrut");

-- CreateIndex
CREATE INDEX "roomings_keberangkatanId_idx" ON "roomings"("keberangkatanId");

-- CreateIndex
CREATE INDEX "roomings_hotelMekkah_hotelMadinah_idx" ON "roomings"("hotelMekkah", "hotelMadinah");

-- CreateIndex
CREATE INDEX "kamar_roomingId_idx" ON "kamar"("roomingId");

-- CreateIndex
CREATE INDEX "penghuni_kamar_kamarId_idx" ON "penghuni_kamar"("kamarId");

-- CreateIndex
CREATE INDEX "penghuni_kamar_jamaahId_idx" ON "penghuni_kamar"("jamaahId");

-- CreateIndex
CREATE INDEX "reminders_groupId_idx" ON "reminders"("groupId");

-- CreateIndex
CREATE INDEX "reminders_status_idx" ON "reminders"("status");

-- CreateIndex
CREATE INDEX "reminders_dikirimPada_idx" ON "reminders"("dikirimPada");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "audit_entries_timestamp_idx" ON "audit_entries"("timestamp");

-- CreateIndex
CREATE INDEX "audit_entries_module_idx" ON "audit_entries"("module");

-- CreateIndex
CREATE INDEX "audit_entries_entityId_entityType_idx" ON "audit_entries"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "audit_entries_userId_idx" ON "audit_entries"("userId");

-- CreateIndex
CREATE INDEX "activity_events_keberangkatanId_idx" ON "activity_events"("keberangkatanId");

-- CreateIndex
CREATE INDEX "activity_events_timestamp_idx" ON "activity_events"("timestamp");

-- CreateIndex
CREATE INDEX "auto_deadlines_keberangkatanId_idx" ON "auto_deadlines"("keberangkatanId");

-- CreateIndex
CREATE INDEX "auto_deadlines_deadlineDate_idx" ON "auto_deadlines"("deadlineDate");

-- CreateIndex
CREATE INDEX "backup_records_createdAt_idx" ON "backup_records"("createdAt");

-- AddForeignKey
ALTER TABLE "registration_groups" ADD CONSTRAINT "registration_groups_paketKeberangkatanId_fkey" FOREIGN KEY ("paketKeberangkatanId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_groups" ADD CONSTRAINT "registration_groups_ketuaGroupId_fkey" FOREIGN KEY ("ketuaGroupId") REFERENCES "jamaah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jamaah" ADD CONSTRAINT "jamaah_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_items" ADD CONSTRAINT "dokumen_items_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "jamaah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_split_configs" ADD CONSTRAINT "invoice_split_configs_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_pembayaran" ADD CONSTRAINT "alokasi_pembayaran_pembayaranId_fkey" FOREIGN KEY ("pembayaranId") REFERENCES "pembayaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_pembayaran" ADD CONSTRAINT "alokasi_pembayaran_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "jamaah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_keberangkatanId_fkey" FOREIGN KEY ("keberangkatanId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifest_rows" ADD CONSTRAINT "manifest_rows_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifest_rows" ADD CONSTRAINT "manifest_rows_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "jamaah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roomings" ADD CONSTRAINT "roomings_keberangkatanId_fkey" FOREIGN KEY ("keberangkatanId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kamar" ADD CONSTRAINT "kamar_roomingId_fkey" FOREIGN KEY ("roomingId") REFERENCES "roomings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penghuni_kamar" ADD CONSTRAINT "penghuni_kamar_kamarId_fkey" FOREIGN KEY ("kamarId") REFERENCES "kamar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penghuni_kamar" ADD CONSTRAINT "penghuni_kamar_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "jamaah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_keberangkatanId_fkey" FOREIGN KEY ("keberangkatanId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_deadlines" ADD CONSTRAINT "auto_deadlines_keberangkatanId_fkey" FOREIGN KEY ("keberangkatanId") REFERENCES "keberangkatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
