# ADR-0025: Standardisasi Hierarki Folder Flyer Multi-Varian dan Eliminasi Redundansi Storage Split Paket

## Status
APPROVED (Product Owner Approved)

## Tanggal
2026-10-16

## Domain
Package Management, Google Drive Cloud Vault, Departure Operations, Marketing Assets, File Storage Architecture

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks & Permasalahan (Context & Problem Statement)

1. **Struktur Penyimpanan Flyer Saat Ini Masih Flat**:
   - Pada implementasi sebelumnya, file flyer brosur (`Flyer-${kodeIndividu}.jpg`) diunggah langsung ke root folder paket keberangkatan (`rootPackageFolderId`).
   - Belum ada subfolder terpisah bernama `FLYER`, sehingga materi pemasaran bercampur langsung di root folder bersama subfolder operasional jamaah (KTP, PASPOR, MANIFEST, dll).

2. **Redundansi Folder Drive pada Paket Split Varian**:
   - Berdasarkan **ADR-0021 (Single Manifest & Penyatuan Kuota Varian)**, paket split varian (seperti promo, spek, atau variasi fasilitas lainnya) tidak memiliki manifest tersendiri karena seluruh jamaah berada pada rombongan pesawat yang sama dengan paket induk.
   - Namun, proses provisioning Google Drive saat ini masih membuat 9 folder lengkap (`PASPOR`, `KTP`, `FOTO`, `PEMBAYARAN`, `MANIFEST`, dll) untuk setiap entitas split varian yang dibuat, yang menyebabkan redundansi folder kosong di Google Drive dan memboroskan kuota storage.

3. **Kebutuhan Pengorganisasian Flyer Per Varian**:
   - Pihak operasional dan marketing VTU memerlukan struktur folder yang rapi dan terorganisir di dalam Google Drive paket keberangkatan:
     - Folder utama paket memiliki subfolder khusus: `FLYER`.
     - Di dalam folder `FLYER`, terdapat subfolder sesuai nama varian masing-masing:
       - `Varian Utama` untuk flyer paket induk/utama.
       - Subfolder bernama varian terkait (misal: `Varian Promo`, `Varian Spek`, atau label spesifik varian) untuk flyer paket split varian.
     - Paket split varian tidak membuat struktur 9 folder tersendiri, melainkan langsung menggunakan folder induk dan hanya mengunggah flyernya ke dalam subfolder varian di dalam folder `FLYER` milik paket induk.

---

## 2. Keputusan Arsitektur (Decision)

1. **Penambahan Subfolder `FLYER` pada Hierarki Folder Paket Induk**:
   - Memodifikasi `createPackageFolderHierarchy()` di `src/server/storage/google-drive.ts` untuk membuat subfolder tambahan:
     - `FLYER` (dibuat di dalam `rootPackageFolderId` sejajar dengan `PASPOR`, `KTP`, `MANIFEST`, dll).
   - Menambahkan field `flyerFolderId` pada interface `DriveFolderRegistry`:
     ```typescript
     export interface DriveFolderRegistry {
       rootPackageFolderId: string;
       flyer?: string; // ID folder FLYER di Google Drive
       paspor: string;
       ktp: string;
       foto: string;
       pembayaran: string;
       tandaTangan: string;
       dokumenLain: string;
       manifest: string;
       export: string;
       formulirPendaftaran: string;
     }
     ```

2. **Struktur Subfolder Varian di Dalam Folder `FLYER` (Murni Khusus Flyer Brosur)**:
   - Folder `FLYER` dan subfolder di dalamnya **HANYA** diperuntukkan untuk menyimpan file flyer brosur promosi paket, tidak ada dokumen jamaah yang disimpan di sini:
     - **Paket Utama**: Flyer disimpan di subfolder `Varian Utama`.
     - **Paket Split Varian**: Flyer disimpan di subfolder `[Nama Varian]` (contoh: `Varian Promo`, `Varian Spek`, atau nilai `splitLabel`).
   - Seluruh file flyer (multi-halaman brosur / itinerary) disimpan ke dalam subfolder varian tersebut.

3. **Penyatuan Dokumen Jamaah Split Varian ke Folder Paket Utama (Document Pooling)**:
   - Ketika paket yang dibuat bertipe split varian (`splitReason !== "starting_point"` dan memiliki `parentKeberangkatanId`):
     - **DILARANG** membuat hierarki 9 folder Drive baru (`PASPOR`, `KTP`, `MANIFEST`, dll).
     - Entitas split varian otomatis **mengadopsi `driveFolderIds` dari paket utama/induk**.
     - **Penyimpanan Dokumen Jamaah**: Seluruh dokumen jamaah (Paspor, KTP, Pas Foto, Bukti Pembayaran, Formulir, dll) yang mendaftar melalui paket split varian **tersimpan langsung di folder paket utama**, bercampur dengan dokumen jamaah varian utama di dalam subfolder operasional masing-masing (`PASPOR`, `KTP`, `FOTO`, dll), karena mereka tergabung dalam satu kesatuan rombongan penerbangan dan satu manifest (konsisten dengan **ADR-0021**).
     - **Penyimpanan Flyer**: Hanya file flyer dari split varian tersebut yang disimpan terpisah, yaitu di dalam subfolder nama variannya pada folder `FLYER` paket utama.

4. **Backward Compatibility & Automatic Provisioning**:
   - Untuk paket eksisting yang belum memiliki folder `FLYER`, sistem otomatis membuat folder `FLYER` dan subfolder `Varian Utama` secara *on-demand* (lazy creation) saat ada flyer yang diunggah atau diedit melalui Media Manager Katalog.

---

## 3. Evidence & Standar EEOS

### Evidence Used
- **E-001 (Google Drive Inspection)**: Hasil inspeksi folder paket `#2026_11H_SBY_GA_OCT10` (Folder ID: `1FCbeB7K7jSzqo86AC9I_9KabRdUwqWBF`) membuktikan bahwa saat ini baru terdapat subfolder operasional tanpa folder `FLYER`.
- **E-002 (Source Code Inspection - Storage)**: `src/server/storage/google-drive.ts` baris 208-230 menunjukkan pembuatan 9 folder operasional tanpa folder `FLYER`.
- **E-003 (Source Code Inspection - Package Service)**: `src/server/services/package.service.ts` baris 365 selalu memanggil `createPackageFolderHierarchy` bahkan untuk varian promo/spek, dan baris 495 mengunggah flyer langsung ke `rootPackageFolderId`.
- **E-004 (ADR Trace)**: `docs/adr/ADR-0021-Single-Manifest-dan-Penyatuan-Varian-Paket-Keberangkatan.md` menetapkan bahwa split varian berbagi penerbangan dan manifest yang sama dengan paket induk.

### Evidence Tier
- Tier 1 (Google Drive API Inspection, Source Code Inspection, Database & Architecture Trace)

### Confidence Level
- **CONFIRMED**

### Implementation Recommendation
- **Proceed Coding / Completed** (Disetujui oleh Product Owner pada 2026-10-16 dengan penegasan: subfolder di folder FLYER khusus untuk flyer varian, sedangkan dokumen jamaah dari paket varian tetap disimpan terpusat di folder operasional paket utama / document pooling).

---

## 4. Konsekuensi (Consequences)

### Positif:
1. **Google Drive Lebih Rapi & Bersih**: Seluruh materi promosi paket dan seluruh variannya terkumpul dalam satu tempat terstruktur di folder `FLYER/[Varian]`.
2. **Hemat Kapasitas & Efisiensi Cloud Storage**: Tidak ada lagi duplikasi 9 folder operasional kosong untuk paket varian yang menumpang manifest induk.
3. **Kemudahan Akses Tim Marketing**: Tim pemasaran cukup membuka folder `FLYER` pada paket terkait di Google Drive untuk menemukan seluruh flyer dari semua varian yang tersedia.

### Rencana Tindak Lanjut Setelah Approval:
1. Update `createPackageFolderHierarchy()` di `src/server/storage/google-drive.ts` untuk membuat folder `FLYER`.
2. Update `package.service.ts` agar saat pembuatan split varian tidak membuat 9 folder baru, melainkan menautkan ke folder `FLYER` paket induk dan membuat subfolder variannya.
3. Update fungsi upload flyer di `package.service.ts` agar selalu mengunggah file ke subfolder varian yang sesuai (`Varian Utama` atau `[Nama Varian]`).
