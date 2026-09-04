# ADR-0012: Sentralisasi Penyimpanan Dokumen PDF Invoice Resmi ke Google Drive

## Status
APPROVED (Product Owner Approved)

## Date
2026-09-04

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), penerbitan dan pengiriman kuitansi / invoice resmi kepada Jamaah dilakukan melalui WhatsApp dan Email dari menu **Manajemen Invoice & Pembayaran** (`/admin/pembayaran/laporan`).

Sebelumnya, dokumen invoice di-generate secara *client-side* di browser admin menggunakan `jsPDF` dan tidak disimpan ke cloud storage. Link unduhan online pada template pesan WhatsApp mengalami *fallback* ke URL web Vercel (`/invoice/[id]?kode=...&download=true`), bukan langsung mengarah ke file di Google Drive.

Product Owner menginstruksikan bahwa seluruh file PDF invoice resmi harus disatukan dan disimpan ke folder terpusat Google Drive dengan ID:
`1KWIURZBbS0lGvazUkSNpMGmo54DM6kDl`.

## Decision
1. **Target Folder Google Drive**:
   - Menetapkan folder ID terpusat untuk seluruh invoice: `1KWIURZBbS0lGvazUkSNpMGmo54DM6kDl`.
   - Menyediakan environment variable `GOOGLE_DRIVE_INVOICE_FOLDER_ID` dengan fallback ke ID di atas.

2. **Perubahan Skema Database (`prisma/schema.prisma`)**:
   - Menambahkan field `invoiceDriveId String?` pada model `Pembayaran`.
   - Menambahkan field `invoiceDriveId String?` pada model `Invoice`.
   - Menyinkronkan perubahan ke database via `npx prisma db push` dan Prisma Client generation.

3. **API Upload Invoice ke Google Drive (`/api/invoices/upload-drive`)**:
   - Membuat API route baru untuk menerima binary/base64 PDF invoice yang dihasilkan secara resmi, mengunggahnya ke folder Google Drive `1KWIURZBbS0lGvazUkSNpMGmo54DM6kDl`, dan memberikan izin akses publik (*role: reader/anyone*).
   - Menyimpan `fileId` Google Drive ke record `Pembayaran` dan `Invoice` di database.
   - Mengembalikan `driveFileId` serta `downloadUrl` (`https://drive.google.com/uc?export=download&id=${fileId}`).

4. **Otomasi Alur UI (`src/app/admin/pembayaran/laporan/page.tsx`)**:
   - Saat admin menyetujui transaksi dan menerbitkan invoice (*Approve & Terbitkan Invoice*) atau membuka modal kirim invoice, sistem secara otomatis mengunggah PDF invoice ke Google Drive.
   - Teks pesan WhatsApp yang ter-generate secara otomatis memuat Direct Download link resmi Google Drive:
     `👉 https://drive.google.com/uc?export=download&id=${driveFileId}`.
   - Menyediakan fallback ke link web invoice jika Google Drive sedang offline atau belum terkonfigurasi.

## Consequences
- File invoice tersentralisasi rapi di Google Drive perusahaan pada satu folder induk (`1KWIURZBbS0lGvazUkSNpMGmo54DM6kDl`).
- Jamaah dapat langsung mengunduh file asli PDF dari pesan WhatsApp tanpa harus melewati halaman web.
- Jejak digital (*audit trail*) dan persistensi file kuitansi resmi tersimpan aman di cloud vault Google Drive.
- Memenuhi seluruh standar EEOS Baseline v1.2 untuk perubahan business rule dan skema database.
