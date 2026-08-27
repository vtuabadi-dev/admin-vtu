# ADR-0008: Master Konfigurasi Rekening Khusus Badal Umroh & Wakaf Al-Qur'an

## Status
APPROVED

## Tanggal
2026-08-27

## Konteks
Pada operasional PT Vauza Tiga Utama, penerimaan dana untuk program **Wakaf Mushaf Al-Qur'an** dan **Badal Umroh** memiliki rekening tujuan khusus yang terpisah dari rekening penampungan pendaftaran/pelunasan paket umroh reguler.

Sebelumnya, nomor rekening pembayaran pada formulir pendaftaran `/register/wakaf-quran` dan `/register/badal-umroh` di-*hardcode* pada antarmuka frontend, sehingga manajemen tidak dapat memperbarui, menambah, atau mengganti nomor rekening operasional wakaf & badal secara mandiri tanpa modifikasi *source code*.

Diperlukan arsitektur konfigurasi dinamis yang dikelola langsung dari menu **Master Data -> Master Badal & Wakaf (`/admin/master/badal-wakaf`)**.

## Keputusan
1. **Pembaruan Skema Database (Prisma Schema)**:
   - Menambahkan model `MasterRekeningLayanan` pada `prisma/schema.prisma`:
     - `id`: String (cuid)
     - `tipeLayanan`: String (`'WAKAF_QURAN'`, `'BADAL_UMROH'`, `'GENERAL'`)
     - `namaBank`: String (misal: "Bank Syariah Indonesia (BSI)", "Bank Mandiri", "BCA")
     - `nomorRekening`: String (misal: "721 888 9991")
     - `atasNama`: String (misal: "PT VAUZA TIGA UTAMA")
     - `keterangan`: String? (opsional keterangan/catatan peruntukan)
     - `isActive`: Boolean (default `true`)
     - `urutan`: Int (default `1`)
     - `updatedBy`: String?

2. **API Endpoint Manajemen Rekening (`/api/master/rekening-layanan`)**:
   - `GET`: Mengambil daftar rekening aktif per `tipeLayanan` dengan *fallback default* yang aman jika data database belum diisi.
   - `POST`: Menyimpan, memperbarui, menambah, atau menghapus konfigurasi rekening oleh Super Admin dan Admin Badal.

3. **Pembaruan Halaman Admin Master (`/admin/master/badal-wakaf`)**:
   - Menambahkan section pengelolaan rekening dinamis khusus untuk Wakaf Al-Qur'an dan Badal Umroh.
   - Admin dapat menambah multi-rekening, mengedit nomor & atas nama, mengubah status aktif, serta menghapus rekening yang tidak digunakan.

4. **Konsumsi Dinamis di Portal Pendaftaran & Tracking**:
   - `/register/wakaf-quran`: Menampilkan rekening aktif dari `tipeLayanan = WAKAF_QURAN`.
   - `/register/badal-umroh`: Menampilkan rekening aktif dari `tipeLayanan = BADAL_UMROH`.
   - `/track/badal-wakaf`: Menampilkan rekening dinamis saat jamaah/pewakaf melakukan konfirmasi pembayaran susulan.

## Konsekuensi
- **Positif**:
  - Rekening penerimaan wakaf dan badal terisolasi dari rekening paket umroh reguler.
  - Perubahan nomor rekening dapat dilakukan secara instan oleh admin operasional/keuangan tanpa deployment ulang.
  - Mendukung multi-bank untuk memudahkan calon pewakaf/pemohon transfer antar bank.
- **Tindakan Lanjutan**:
  - Menjalankan `npx prisma db push` dan `npx prisma generate`.
