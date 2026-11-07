# ADR-0031: Pemisahan Siklus Hidup Paket Aktif, Paket Arsip, Serta Aturan Tiga Syarat Mutlak Publikasi Katalog

## Status
APPROVED (Product Owner Approved via User Request 2026-11-04)

## Date
2026-11-04

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), menu **Paket Umroh** menampilkan seluruh paket keberangkatan (`Keberangkatan`) di halaman Paket Aktif (`/admin/keberangkatan`) tanpa filter kedaluwarsa kepulangan. Akibatnya, paket yang agendanya sudah selesai di masa lalu (seperti paket Juni 2026 sementara sistem berjalan di November 2026) masih menumpuk di halaman utama paket aktif dan bahkan berisiko tampil di katalog jika saklarnya aktif.

Product Owner memberikan instruksi dan standarisasi aturan bisnis (*Business Rules*) sebagai berikut:
1. **Kriteria Paket Arsip**:
   - Kedaluwarsa paket dihitung berdasarkan **tanggal kepulangan (`tanggalPulang`)**.
   - Paket yang agendanya sudah selesai (`tanggalPulang < hari ini jam 00:00:00`) otomatis berpindah ke **Paket Arsip**.
2. **Kategori di Paket Aktif (2 Tab di Atas Filter Bulan)**:
   - Di dalam halaman Paket Aktif, di atas filter bulan disediakan 2 tab segmentasi:
     1. **Akan Berangkat** (Paket Belum Berangkat: `tanggalBerangkat > hari ini`).
     2. **Sedang Berjalan** (Paket Sedang Berlangsung di Tanah Suci: `tanggalBerangkat <= hari ini && tanggalPulang >= hari ini`).
3. **Tiga Syarat Mutlak Katalog Paket**:
   Paket yang tampil di menu **Katalog** WAJIB memenuhi **3 syarat serentak (*strict AND condition*)**:
   1. **Paket Aktif yang Belum Berangkat** (`tanggalBerangkat > hari ini`).
   2. **Belum Penuh Kuotanya / Seat-nya** (`terisi < maxSeat` atau `terisi < kuota`).
   3. **Saklar Penampilan di Katalog Aktif** (`isPublishedKatalog === true`).
   *Jika salah satu saja dari ketiga syarat tersebut tidak terpenuhi, maka paket TIDAK AKAN TAMPIL di katalog.*
4. **Submenu Navigasi**:
   Menambahkan submenu **Paket Arsip** di bawah grup navigasi **Paket Umroh** pada sidebar dan menyediakan rute khusus `/admin/keberangkatan/arsip` serta tab navigasi antar halaman.

---

## Decision

### 1. Standarisasi Helper Klasifikasi Siklus Paket (`@/shared/lib/package-lifecycle.ts`)
Dibuat modul helper terpusat yang menentukan status siklus hidup paket:
```typescript
/**
 * Memeriksa apakah agenda perjalanan paket sudah selesai (masuk arsip).
 * Dihitung berdasarkan tanggal kepulangan (tanggalPulang).
 */
export function isPackageArchived(pkg: { tanggalPulang?: string | Date | null; status?: string }): boolean {
  if (pkg.status === "completed" || pkg.status === "COMPLETED") return true;
  if (!pkg.tanggalPulang) return false;
  const returnDate = new Date(pkg.tanggalPulang);
  if (isNaN(returnDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const retYear = returnDate.getFullYear();
  const retMonth = returnDate.getMonth();
  const retDay = returnDate.getDate();
  const returnDateOnly = new Date(retYear, retMonth, retDay);

  return returnDateOnly.getTime() < today.getTime();
}

/**
 * Memeriksa apakah paket sedang berjalan (in-trip).
 * Jamaah sudah berangkat tetapi belum pulang.
 */
export function isPackageInProgress(pkg: { tanggalBerangkat?: string | Date | null; tanggalPulang?: string | Date | null; status?: string }): boolean {
  if (isPackageArchived(pkg)) return false;
  if (!pkg.tanggalBerangkat) return false;

  const depDate = new Date(pkg.tanggalBerangkat);
  if (isNaN(depDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const depYear = depDate.getFullYear();
  const depMonth = depDate.getMonth();
  const depDay = depDate.getDate();
  const depDateOnly = new Date(depYear, depMonth, depDay);

  return depDateOnly.getTime() <= today.getTime();
}

/**
 * Memeriksa apakah paket belum berangkat (akan berangkat).
 */
export function isPackageUpcoming(pkg: { tanggalBerangkat?: string | Date | null; tanggalPulang?: string | Date | null; status?: string }): boolean {
  return !isPackageArchived(pkg) && !isPackageInProgress(pkg);
}

/**
 * Memeriksa apakah seat paket sudah penuh.
 */
export function isPackageSeatFull(pkg: { terisi?: number; kuota?: number; maxSeat?: number | null }): boolean {
  const max = pkg.maxSeat || pkg.kuota || 0;
  if (max <= 0) return false;
  return (pkg.terisi || 0) >= max;
}

/**
 * TIGA SYARAT MUTLAK KATALOG PAKET:
 * 1. Paket Aktif yang Belum Berangkat (Upcoming)
 * 2. Seat Belum Penuh
 * 3. Saklar Katalog Aktif
 */
export function isEligibleForKatalog(pkg: {
  tanggalBerangkat?: string | Date | null;
  tanggalPulang?: string | Date | null;
  status?: string;
  terisi?: number;
  kuota?: number;
  maxSeat?: number | null;
  isPublishedKatalog?: boolean;
  driveFolderIds?: any;
}): boolean {
  // Syarat 1: Belum berangkat
  if (!isPackageUpcoming(pkg)) return false;

  // Syarat 2: Belum penuh seatnya
  if (isPackageSeatFull(pkg)) return false;

  // Syarat 3: Saklar penampilan katalog aktif
  const isPub = pkg.isPublishedKatalog ?? ((pkg.driveFolderIds as any)?.isPublishedKatalog === true);
  if (!isPub) return false;

  return true;
}
```

### 2. Antarmuka Halaman Paket Aktif (`/admin/keberangkatan`)
1. **Dua Tab Kategori di Atas Filter Bulan**:
   - **"Akan Berangkat"** (`upcoming`): Menampilkan paket yang tanggal berangkatnya di masa mendatang (`tanggalBerangkat > hari ini`).
   - **"Sedang Berjalan"** (`in_progress`): Menampilkan paket yang saat ini sedang berlangsung di Tanah Suci (`tanggalBerangkat <= hari ini <= tanggalPulang`).
   - Menyertakan badge jumlah paket di setiap tab.
2. **Koneksi dengan Filter Bulan**:
   Filter bulan (Januari, Juni, dsb.) secara dinamis memfilter subset paket sesuai tab yang aktif (Akan Berangkat atau Sedang Berjalan).

### 3. Submenu & Halaman Paket Arsip (`/admin/keberangkatan/arsip`)
1. **Sidebar (`Sidebar.tsx`)**:
   Menambahkan `Paket Arsip` di bawah grup navigasi `PAKET UMROH` mengarah ke `/admin/keberangkatan/arsip`.
2. **Halaman `/admin/keberangkatan/arsip`**:
   Menampilkan daftar paket yang tanggal kepulangannya telah terlewat (`tanggalPulang < hari ini`).
   Menyajikan ringkasan arsip, pencarian, dan filter bulan untuk riwayat paket masa lalu.

### 4. Implementasi Tiga Syarat Mutlak di Katalog (`/admin/paket-umroh/katalog`)
Di halaman `src/app/admin/paket-umroh/katalog/page.tsx`:
Pada fungsi `publishedPackages`:
```typescript
for (const pkg of packages) {
  // Syarat 1: Harus belum berangkat
  if (!isPackageUpcoming(pkg)) continue;

  // Syarat 2: Harus belum penuh seat-nya
  if (isPackageSeatFull(pkg)) continue;

  // Syarat 3: Saklar katalog aktif (dicek per varian / per paket)
  ...
}
```
Jika salah satu syarat tidak terpenuhi, paket atau varian terkait 100% tidak akan dimasukkan ke dalam daftar katalog yang dapat dilihat calon jamaah/agen.

---

## Consequences
- **Segmentasi Operasional Sempurna**: Admin memiliki visibilitas jelas terhadap paket yang sedang berjalan di Tanah Suci vs paket yang masih dalam persiapan pemberangkatan.
- **Katalog Bersih & Terpercaya**: Agen dan calon jamaah hanya akan melihat paket yang benar-benar siap dibeli (belum berangkat, seat masih tersedia, dan telah disetujui tampil).
- **Arsip Rapi**: Seluruh data masa lalu otomatis tersimpan aman di Paket Arsip tanpa mengotori ruang kerja operasional aktif.
- **Kepatuhan EEOS v1.2**: Aturan bisnis telah disepakati dan diabadikan dalam sistem governance.
