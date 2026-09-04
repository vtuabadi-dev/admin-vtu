# ADR-0015: Modul Manajemen Perlengkapan (Stok Gudang & Pengambilan), Status Visual Manifest, dan Retensi Data Kelurahan/Kecamatan untuk SISKOPATUH

## Status
APPROVED (Product Owner Approved)

## Date
2026-09-04

## Context
Pada alur operasional PT Vauza Tamma Abadi (VTU ABADI Travel), pendataan jamaah dan logistik perlengkapan umroh memerlukan keterpaduan antara:
1. **Persyaratan Dokumen SISKOPATUH (Kemenag RI)**:
   Manifest SISKOPATUH mewajibkan kelengkapan data domisili hingga tingkat Kelurahan dan Kecamatan. Meskipun kolom Kelurahan dan Kecamatan tidak ditampilkan pada tabel ringkas Manifest Utama (agar tabel tetap lega dan fokus pada nomor paspor & identitas pokok), database `Jamaah` **wajib menyimpan data Kelurahan dan Kecamatan per jamaah** secara presisi.
2. **Status Visual Perlengkapan di Manifest Utama**:
   Status fasilitas perlengkapan jamaah saat ini hanya menampilkan badge sederhana ("Termasuk Perlengkapan" / "Tanpa Perlengkapan"). Product Owner menginstruksikan standarisasi 4 status visual yang jelas:
   - **Tanpa Perlengkapan ("Tanpa")**: Wajib berlatar belakang **stabilo hitam** dengan teks **putih** (`bg-black text-white font-bold`).
   - **Dengan Perlengkapan ("Ada")**, memiliki 3 kondisi pengambilan:
     - **Sudah Ambil**: Berwarna **Hijau** (`bg-emerald-600 text-white`).
     - **Belum Ambil**: Berwarna **Orange** (`bg-amber-500 text-white`).
     - **Ambil Sebagian**: Berwarna **Kuning** (`bg-yellow-400 text-stone-900`).
3. **Menu Baru di Menubar (Sidebar)**:
   Perluasan menu navigasi utama dengan menambahkan menu **Perlengkapan**, yang memiliki 2 sub-menu:
   - **Stok Gudang** (`/admin/perlengkapan/stok`): Manajemen kuantitas fisik barang perlengkapan umroh (koper besar, koper kabin, batik, buku manasik, tas paspor, dll), input stok masuk/keluar, dan monitoring sisa stok aman.
   - **Pengambilan** (`/admin/perlengkapan/pengambilan`): Monitoring daftar jamaah per paket keberangkatan beserta checklist pengambilan barang (sudah ambil, ambil sebagian, belum ambil, atau tanpa perlengkapan) dan update status serah terima.

## Decision
Arsitektur sistem menyepakati keputusan teknis berikut:

### 1. Retensi Data Domisili (Kelurahan & Kecamatan) pada Database Jamaah
- Memastikan field `kecamatan String` dan `kelurahan String` pada model `Jamaah` di database selalu tersimpan dengan baik:
  - Pada formulir registrasi online / import Excel manifest, data kelurahan dan kecamatan diekstrak dan disimpan.
  - Pada verifikasi OCR KTP, field `kelurahan` dan `kecamatan` hasil pembacaan KTP langsung memperbarui record jamaah.
  - Pada ekspor / pembentukan Manifest SISKOPATUH, data kelurahan dan kecamatan ditarik sebagai atribut resmi jamaah.

### 2. Penambahan Skema Perlengkapan & Status Pengambilan (`prisma/schema.prisma`)
- Menambahkan status perlengkapan pada model `Jamaah`:
  - `statusPerlengkapan String @default("BELUM_AMBIL")` // "TANPA" | "BELUM_AMBIL" | "SEBAGIAN" | "SUDAH_AMBIL"
  - `catatanPerlengkapan String?`
  - `tanggalAmbilPerlengkapan DateTime?`
- Memperkaya model `MasterPerlengkapan`:
  - `stokTersedia Int @default(0)`
  - `stokMinimum Int @default(10)`
  - `satuan String @default("pcs")`
- Menambahkan model `PerlengkapanMutasi` untuk pencatatan audit stok gudang (stok masuk, stok keluar, serah terima jamaah).
- Menambahkan model `PengambilanPerlengkapanItem` untuk checklist barang yang diambil per jamaah.

### 3. Tampilan Status Perlengkapan di Tabel Manifest Utama (`/admin/manifest`)
- Pada kolom `KLASTER & FASILIT.` (atau kolom khusus Perlengkapan), status ditampilkan dengan aturan visual spesifik:
  - **TANPA PERLENGKAPAN**: Badge berlatar **stabilo hitam** (`bg-black dark:bg-stone-950 text-white font-extrabold px-2 py-0.5 rounded shadow-sm border border-stone-800`).
  - **SUDAH AMBIL**: Badge berwarna **Hijau** (`bg-emerald-600 text-white font-bold px-2 py-0.5 rounded shadow-xs`).
  - **BELUM AMBIL**: Badge berwarna **Orange** (`bg-amber-500 text-white font-bold px-2 py-0.5 rounded shadow-xs`).
  - **AMBIL SEBAGIAN**: Badge berwarna **Kuning** (`bg-yellow-400 text-stone-950 font-bold px-2 py-0.5 rounded shadow-xs`).
- Disediakan interaksi cepat (klik dropdown/modal) bagi admin untuk mengubah status pengambilan jamaah langsung dari tabel manifest.

### 4. Menu Navigasi Menubar (`Sidebar.tsx`) & Halaman Baru
- Menambahkan seksi menu **PERLENGKAPAN** di `src/shared/components/layout/Sidebar.tsx` dengan ikon `PackageCheck`:
  - Sub-menu 1: **Stok Gudang** (`/admin/perlengkapan/stok`)
  - Sub-menu 2: **Pengambilan** (`/admin/perlengkapan/pengambilan`)
- Membangun halaman **Stok Gudang**:
  - Tabel master barang perlengkapan, stok saat ini, stok minimum, tombol tambah stok / penyesuaian stok (*Stock In/Out*).
- Membangun halaman **Pengambilan**:
  - Filter per paket keberangkatan, pencarian jamaah/grup.
  - Kartu ringkasan: Total Jamaah Termasuk Perlengkapan, Sudah Ambil, Ambil Sebagian, Belum Ambil, dan Tanpa Perlengkapan.
  - Tabel serah terima dengan checklist item per jamaah dan tombol cetak tanda terima pengambilan.

### 5. Persistensi Master Opsi Tagihan & Potongan ke Supabase
- Menambahkan model `MasterBillingOption` pada `prisma/schema.prisma`:
  - `id String @id @default(cuid())`
  - `kategori String` // "tambahan" | "potongan"
  - `nama String`
  - `isActive Boolean @default(true)`
- Menggantikan penyimpanan sementara `localStorage` dengan API database resmi `/api/admin/pembayaran/billing-options`, sehingga jenis tambahan tagihan dan potongan tersimpan permanen di cloud database Supabase.

## Consequences
- **Sesuai Standar Regulasi**: Manifest SISKOPATUH dapat dibangun secara utuh tanpa kekurangan data kecamatan dan kelurahan.
- **Transparansi Logistik**: Staf operasional dan admin manifest memiliki visibilitas langsung terhadap status fisik perlengkapan jamaah dengan visualisasi warna yang tegas dan kontras.
- **Pengendalian Stok Real-Time**: Barang di gudang tercatat rapi dan mutasi keluar otomatis terhubung dengan penyerahan barang kepada jamaah.
- **Kepatuhan EEOS**: Seluruh rencana implementasi diselaraskan dengan tata kelola Baseline v1.2.
