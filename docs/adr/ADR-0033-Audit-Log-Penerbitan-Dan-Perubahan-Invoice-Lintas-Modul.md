# ADR-0033: Audit Log Penerbitan dan Pembaruan Invoice Lintas Modul

## Status
APPROVED (Product Owner Approved via Implementation Plan Feedback 2026-11-12)

## Date
2026-11-12

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), penerbitan maupun perubahan tagihan/invoice (*Pembaruan Invoice*, penambahan/pengubahan/penghapusan item rincian tagihan, pembatalan item, penambahan pax/jamaah, perubahan hotel upgrade jamaah, serta pindah paket) memengaruhi tiga domain operasional utama secara langsung:
1. **Pembayaran & Invoice** (`Peninjauan Pembayaran`, `Riwayat Pembayaran Group`, `Histori Pembayaran`, `Monitoring Pembayaran`, `Detail Grup`, `Create Invoice`).
2. **Manifest Pembayaran** (`ManifestPembayaranTable` dan modal riwayat pembayarannya).
3. **Data Jamaah** (perubahan komposisi pax, paket, dan hotel jamaah).

Sebelumnya, aksi `PEMBARUAN_INVOICE` pada `createInvoice` melewati pembuatan record `Pembayaran` karena tidak ada dana kas masuk (`Rp 0`), sementara seluruh antrean peninjauan dan tabel riwayat hanya membaca tabel `pembayaran`. Akibatnya, aktivitas penerbitan/perubahan invoice (misalnya filter tanggal `Kemarin` saat dilakukan `Pembaruan Invoice`) tidak tercatat maupun tertampil pada tabel riwayat/monitoring.

---

## Decision

### 1. Kepatuhan Schema Freeze (ADR-0029)
- **TIDAK dilakukan perubahan** pada `prisma/schema.prisma`.
- Seluruh jejak audit baru disimpan ke tabel `audit_entries` (`AuditEntry`) yang sudah tersedia dengan `module: "pembayaran"`, `entityId: groupId`, `entityType: "invoice_revision"` (atau `"registration_group"`), serta kolom `detail`, `before`, dan `after` berformat JSON terstruktur.

### 2. Sumber Log Ganda (Persistent Audit + Sintesis Data Historis)
Dibuat modul murni bersama `@/shared/lib/invoice-audit-log` dan service server `@/server/services/invoice-audit.service`:
- **Pencatatan Aktif (`AuditEntry`)**: Setiap mutasi pada `syncGroupBillingItems` (penambahan/pengeditan/penghapusan item dengan opsi deduplikasi `{ skipAuditLog }` bila dipanggil dari `createInvoice`), `createInvoice`, `cancelInvoiceItem`, `addJamaahToGroup`, `updateJamaahHotels`, `transferPackageGroup`, serta `/api/pembayaran/[id]/approve` dan `/reject` mencatat log terstruktur berisi aktor, waktu, nomor invoice, kategori aksi, ringkasan diff item (`+ / ~ / -`), total tagihan sebelum → sesudah, dan dampak manifest/jamaah.
- **Sintesis Historis Fallback**: Untuk data transaksi/invoice yang terbit sebelum ADR ini aktif (`INV-UPD-*`, `INV-PAX-*`, `PINDAH-*`, `CN-CANCEL-*`, `REF-*`, `INV-*`, serta `InvoiceItem` berstatus `cancelled`), timeline builder menyintesis entri log dari tabel `Invoice` dan `InvoiceItem` lalu menggabungkannya secara kronologis dengan `AuditEntry` tanpa duplikasi.

### 3. Aturan Keamanan Akuntansi untuk Entri Non-Kas (`isLogOnly: true`)
- Entri log perubahan/penerbitan invoice yang diproyeksikan ke antrean atau tabel peninjauan memiliki `recordType: "invoice_log"`, `isLogOnly: true`, dan `jumlah = 0` (`Rp 0 Masuk`).
- Entri `isLogOnly` **dilarang keras** dihitung ke akumulasi `totalPembayaran` / `Total Dana Masuk` / `sisaPembayaran`.
- Antarmuka `Peninjauan Pembayaran` tidak menampilkan tombol *Quick Approve* maupun persetujuan kas untuk entri `isLogOnly`, dan menggantinya dengan aksi baca/pratinjau (`Preview Invoice`, `Unduh PDF`, `Kirim Invoice`).
- Aksi `Hapus Data Percobaan` dan penghapusan transaksi kas pada peninjauan tidak boleh menghapus catatan `AuditEntry` maupun entri `isLogOnly` permanen.

### 4. Penyebaran Lintas Tabel Riwayat & Sinkronisasi Realtime
Log penerbitan & perubahan invoice ditampilkan secara seragam pada:
1. `Peninjauan Pembayaran (Slip Verification)` — antrean kiri & tabel `Riwayat Pembayaran` kanan.
2. `Riwayat Pembayaran Group` pada tab `Daftar & Input Pembayaran Group`.
3. Halaman `Histori Pembayaran` (`/admin/pembayaran/histori`).
4. Modal riwayat pembayaran di `Manifest Pembayaran`, `/admin/pembayaran` (`Monitoring Pembayaran`), `/admin/pembayaran/[groupId]`, serta `CreateInvoiceModal`.
- `RealtimeEntity` pada `realtime-bus.ts` dan `RealtimeProvider.tsx` diperluas dengan `"audit_entries"` untuk sinkronisasi otomatis lintas tab/klien.

---

## Consequences
- **Positif**: Seluruh perubahan tagihan, item upgrade, penambahan pax, pindah paket, dan pembaruan invoice kini memiliki audit trail yang konsisten antara Pembayaran, Manifest, dan Data Jamaah tanpa migrasi database.
- **Mitigasi Risiko**: Pengujian otomatis Vitest memverifikasi kalkulasi diff item, deduplikasi histori `AuditEntry` vs `Invoice`, dan isolasi nominal `Rp 0 Masuk` dari total kas.

