# ADR-0024: Modul Buku Tamu Terintegrasi Kantor Cabang dan Katalog Paket Umroh dengan Integrasi Google Drive

## Status
PROPOSED (Waiting Product Owner Approval)

## Tanggal
2026-10-13

## Domain
Jamaah Management, Guest Book, Branch Office Operations, Package Catalog, Google Drive Vault, Marketing & WhatsApp Integration

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks & Permasalahan (Context & Problem Statement)

1. **Pencatatan Tamu Belum Tersentralisasi di Cabang**:
   - Saat ini interaksi tatap muka dengan calon jamaah yang datang langsung ke kantor (Malang, Jakarta, Surabaya) belum tercatat secara sistematis di aplikasi VTU Admin.
   - Diperlukan pencatatan tamu langsung oleh admin penerima, kejelasan penempatan admin di kantor cabang mana, visibilitas tamu kantor, serta kemampuan memfilter *"Hanya Tamu yang Saya Terima"*.
   - Siklus penerimaan tamu memerlukan penutupan aktivitas dengan evaluasi hasil kunjungan:
     - **Closing** (langsung mendaftar).
     - **Minat**: Disertai pemilihan bulan keberangkatan (wajib), serta preferensi paket (Reguler / Plus) dan tanggal estimasi (opsional setelah bulan terisi).
   - Admin memerlukan tombol aksi cepat di tabel buku tamu untuk mengirimkan link pendaftaran jamaah online ke WhatsApp calon jamaah tersebut.

2. **Penyimpanan Flyer & Caption Paket serta Katalog Paket Bulanan**:
   - Saat admin membuat/men-generate paket di `/admin/paket-umroh/generate`, materi promosi berupa flyer dan caption belum tersimpan otomatis ke vault terpusat Google Drive dan basis data.
   - Admin pemasaran membutuhkan submenu **Katalog Paket** (`/admin/paket-umroh/katalog`) yang mengelompokkan paket umroh per bulan dengan tampilan flyer dan caption yang rapi.
   - Setiap paket dalam katalog harus memiliki tombol *"Kirim ke WA"*, di mana admin dapat memilih target penerima dari **Daftar Tamu milik admin itu sendiri**, lalu otomatis membuka hyperlink WhatsApp dengan pesan caption dan flyer paket terkait.

---

## 2. Keputusan Arsitektur (Decision)

### A. Perubahan Skema Basis Data (`prisma/schema.prisma`)

1. **Penambahan Field Kantor Cabang pada Model `User`**:
   ```prisma
   model User {
     // ... field yang sudah ada ...
     kantorCabang       String?         @default("Malang") // "Malang" | "Surabaya" | "Jakarta"
     // ...
   }
   ```

2. **Pembuatan Model Baru `BukuTamu`**:
   ```prisma
   enum HasilKunjunganTamu {
     CLOSING
     MINAT
   }

   enum StatusKunjunganTamu {
     SEDANG_BERKUNJUNG
     SELESAI
   }

   model BukuTamu {
     id                 String               @id @default(cuid())
     namaTamu           String
     nomorWa            String
     kotaAsal           String?
     keperluan          String?              @db.Text
     kantorCabang       String               // "Malang" | "Surabaya" | "Jakarta"
     adminId            String
     adminName          String
     waktuKunjungan     DateTime             @default(now())
     statusKunjungan    StatusKunjunganTamu  @default(SEDANG_BERKUNJUNG)
     hasilKunjungan     HasilKunjunganTamu?
     minatBulan         String?              // contoh: "November 2026"
     minatJenisPaket    String?              // contoh: "Reguler", "Plus Turki"
     minatTanggal       DateTime?
     catatanHasil       String?              @db.Text
     createdAt          DateTime             @default(now())
     updatedAt          DateTime             @updatedAt

     @@index([adminId])
     @@index([kantorCabang])
     @@index([statusKunjungan])
     @@map("buku_tamu")
   }
   ```

3. **Penambahan Kolom Promosi pada Model `Keberangkatan`**:
   ```prisma
   model Keberangkatan {
     // ... field yang sudah ada ...
     flyerUrl           String?
     flyerDriveId       String?
     caption            String?              @db.Text
     // ...
   }
   ```

### B. Modul 1: Submenu Buku Tamu (`/admin/jamaah/buku-tamu`)
1. **Navigasi Sidebar**:
   - Menambahkan menu item `Buku Tamu` di bawah grup navigasi **JAMAAH** pada `Sidebar.tsx`.
2. **Formulir Input Tamu**:
   - Diisi oleh admin penerima: Nama Tamu, Nomor WhatsApp, Kota/Asal, Keperluan Kunjungan.
   - Admin penerima (`adminId`, `adminName`) dan Kantor Penempatan (`kantorCabang`) terisi secara otomatis dari identitas akun yang sedang login.
3. **Tabel Buku Tamu**:
   - Menampilkan seluruh riwayat kunjungan tamu lengkap dengan badge kantor cabang dan nama admin penerima.
   - Dilengkapi toggle filter: **"Semua Tamu"** dan **"Hanya Tamu yang Saya Terima"**.
   - Kolom status kunjungan (`Sedang Berkunjung` vs `Selesai`).
4. **Modal Tutup Aktivitas Kunjungan**:
   - Tombol aksi "Tutup Kunjungan" membuka dialog:
     - Dropdown: `Closing` / `Minat`.
     - Jika `Minat` dipilih:
       - Dropdown Bulan Keberangkatan (Wajib diisi).
       - Dropdown/Input Jenis Paket (Reguler / Plus) & Tanggal (Opsional setelah bulan terisi).
     - Kolom catatan tambahan.
5. **Aksi Kirim Link Pendaftaran**:
   - Di pojok kanan baris tabel terdapat tombol aksi cepat WhatsApp:
     - Mengarahkan ke tautan `https://wa.me/{nomorWa}?text=...` berisi sambutan ramah dari VTU Abadi dan tautan langsung ke formulir pendaftaran jamaah online (`/pendaftaran?ref=...`).
     - Disertai opsi salin link (*Copy Link*).

### C. Modul 2: Submenu Katalog Paket (`/admin/paket-umroh/katalog`) & Google Drive Storage
1. **Navigasi Sidebar**:
   - Menambahkan menu item `Katalog Paket` di bawah grup navigasi **PAKET UMROH** pada `Sidebar.tsx`.
2. **Integrasi Google Drive saat Generate Paket (`/admin/paket-umroh/generate`)**:
   - Saat admin membuat paket baru atau varian paket dengan upload flyer dan input caption:
     - Flyer otomatis diunggah ke Google Drive ke dalam folder paket (`driveFolderIds.rootPackageFolderId`) atau folder promosi, diberikan hak akses publik view, dan URL serta ID Drive disimpan ke basis data (`flyerUrl`, `flyerDriveId`).
     - Caption disimpan ke field `caption` pada model `Keberangkatan`.
3. **Tampilan Halaman Katalog Paket**:
   - Navigasi tab / filter per bulan (e.g. Oktober 2026, November 2026, Desember 2026, dst.).
   - Card katalog paket memuat: preview gambar flyer resmi dari Google Drive, nama paket, maskapai, hotel bintang, tanggal berangkat, sisa seat, harga, serta teks caption siap promosi.
4. **Fitur "Kirim ke WA" ke Tamu Admin**:
   - Setiap card paket memiliki tombol **"Kirim ke WA"**.
   - Mengklik tombol membuka modal interaktif: **"Pilih Calon Jamaah / Tamu Penerima"**.
   - Modal secara otomatis menyaring dan menampilkan **Daftar Tamu milik admin yang sedang login** dari modul Buku Tamu.
   - Setelah admin memilih salah satu tamu, sistem men-generate hyperlink WhatsApp:
     ```
     https://wa.me/{nomorWaTamu}?text={encodeURIComponent(pesanPromosi)}
     ```
     Pesan memuat salam sapaan personal untuk tamu, detail paket, link flyer/preview Google Drive, dan caption lengkap.

---

## 3. Konsekuensi & Dampak (Consequences)

- **Positif**:
  - Seluruh kunjungan fisik calon jamaah di kantor Malang, Surabaya, dan Jakarta tercatat akuntabel dan transparan.
  - Setiap admin memiliki database calon jamaah binaannya masing-masing dengan riwayat minat paket.
  - Flyer dan materi promosi paket tidak hilang dan tersentralisasi rapi di Google Drive perusahaan.
  - Alur konversi dari tamu kantor menjadi pendaftar jamaah menjadi sangat cepat dan terotomatisasi melalui satu klik WhatsApp.
- **Dampak Skema**:
  - Membutuhkan migrasi skema database (`npx prisma db push`).
  - Memperbarui User management form untuk mengakomodasi penempatan kantor cabang admin (Malang / Jakarta / Surabaya).

---

## 4. Status Persetujuan (Governance Decision Gate)

Berdasarkan **EEOS Governance Baseline v1.2**:
- Perubahan ini memicu **Database Schema berubah**, **Business Rule berubah**, dan **Infrastructure (Google Drive Storage) berubah**.
- Implementasi coding dibekukan (*STOP IMPLEMENTATION*) sampai dokumen ADR ini ditinjau dan disetujui oleh Product Owner.
