# ADR-0007: Role Admin Badal Umroh & Wakaf

## Status
APPROVED

## Tanggal
2026-08-24

## Konteks
Sistem operasional VTU mengelola berbagai domain operasional terpisah seperti administrasi keberangkatan, keuangan/pembayaran, manifest penerbangan, verifikasi dokumen, serta layanan **Badal Umroh & Wakaf Qur'an**.

Sebelumnya, sistem memiliki role:
1. `super_admin` (Akses Penuh Sistem)
2. `admin_operasional` (Manajemen Paket & Operasional)
3. `admin_pembayaran` (Keuangan, Invoice, & Verifikasi Slip)
4. `admin_manifest` (Manifest, Rooming, & Paspor)
5. `admin_dokumen` (Kelengkapan Dokumen & OCR)
6. `tour_leader` (Tour Leader / Mutgowif)
7. `jamaah` (Jamaah Portal)

Untuk memastikan prinsip *least privilege* dan pemisahan tugas (*separation of duties*), diperlukan role spesifik **`admin_badal` (Admin Badal Umroh & Wakaf)** yang bertanggung jawab khusus atas:
- Manajemen permohonan Badal Umroh (`/admin/badal-umroh`)
- Manajemen program Wakaf Al-Qur'an (`/admin/wakaf-quran`)
- Laporan Kolektif Badal & Niat Badal per Paket Keberangkatan (`/admin/laporan-paket`)
- Master Data Badal, Wakaf, & Petugas Amanah (`/admin/master/badal-wakaf`, `/admin/master/petugas`)

## Keputusan
1. **Pembaruan Skema Prisma & Domain Types**:
   - Menambahkan enum `admin_badal` ke `OperationalRole` pada `schema.prisma`.
   - Menambahkan tipe union `"admin_badal"` ke `OperationalRole` pada `src/shared/types/index.ts`.
   - Memetakan `admin_badal` ke Enterprise Role `STAFF` pada `ENTERPRISE_ROLE_MAP`.

2. **Pembaruan Matriks Hak Akses (RBAC & Visibility)**:
   - Menetapkan hak akses `FULL` / `FULL_NO_DELETE` untuk modul `badal` dan `laporan-paket`, serta `VIEW_ONLY` untuk modul pendukung (`keberangkatan`, `jamaah`, `manifest`).
   - Mendaftarkan label resmi `"Admin Badal Umroh & Wakaf"` pada `ROLE_LABELS`.
   - Memberikan varian styling badge khusus (warna teal/emerald-600) pada `ROLE_BADGE_CLASSES`.

3. **Pembaruan Halaman Manajemen User (`/admin/users`)**:
   - Menambahkan opsi `"Admin Badal Umroh & Wakaf"` pada modal Tambah Admin Baru (`isModalOpen`).
   - Mendukung pembuatan, pengeditan, dan monitoring akun admin badal umroh & wakaf oleh Super Admin.

## Konsekuensi
- **Positif**:
  - Delegasi pengelolaan data badal umroh dan wakaf qur'an menjadi terstruktur dan aman.
  - Staf pengelola badal tidak memiliki akses ubah ke modul pembayaran, audit trail, atau konfigurasi sistem.
- **Tindakan Lanjutan**:
  - Sinkronisasi `prisma generate` untuk memperbarui Prisma Client di server.
