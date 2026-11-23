# ADR-0035: Syarat dan Ketentuan Berbasis Bab (Chapter System) & Persetujuan Sekuensial Jamaah

- **Status:** Proposed (Waiting Product Owner Approval)
- **Tanggal:** 2026-11-23
- **Governance:** EEOS Governance Baseline v1.2 (Bagian 12 — Business Rule, Breaking UI & Cross Domain Impact)
- **Relasi ADR:** ADR-0029 (Database Schema Freeze — `prisma/schema.prisma` tidak diubah)

---

## 1. Konteks Masalah

1. Pada halaman CMS Admin **Aturan Operasional** ([/admin/pengaturan/aturan-operasional](file:///d:/Projects/app-admin-vtu/src/app/admin/pengaturan/aturan-operasional)), pembuatan versi baru dokumen Syarat & Ketentuan Umroh saat ini hanya menyediakan satu kolom teks tunggal (*single rich text editor*).
2. Pada alur registrasi jamaah ([/register](file:///d:/Projects/app-admin-vtu/src/app/register)), Syarat & Ketentuan ditampilkan dalam satu wadah scroll panjang (*monolithic scroll container*). Jamaah harus men-scroll dari atas sampai bawah sekali jalan lalu mencentang satu kotak persetujuan tunggal di bagian paling bawah.
3. Kebutuhan operasional menginginkan Syarat & Ketentuan dipecah secara terstruktur menjadi **Bab-Bab** (misal: *Bab 1: Ketentuan Umum & Pendaftaran*, *Bab 2: Jadwal & Tahapan Pembayaran*, *Bab 3: Kebijakan Pembatalan & Refund*, *Bab 4: Pengurusan Dokumen & Paspor*, dst.).
4. Pada sisi jamaah, pembacaan dan persetujuan dilakukan secara **sekuensial per bab**:
   - Jamaah membaca bab yang sedang aktif.
   - Jamaah mencentang persetujuan khusus bab tersebut.
   - Setelah dicentang, tombol/alur otomatis berpindah ke bab selanjutnya.
   - Alur ini berlanjut sampai seluruh bab dibaca dan dicentang, barulah jamaah dapat melanjutkan pendaftaran.

---

## 2. Keputusan Arsitektur & Aturan Bisnis

### A. Persistensi Data Tanpa Perubahan Skema Database (Zero Schema Drift)
Model Prisma `OperationalDocument` memiliki kolom `content String`. Agar tidak mengubah schema database (`prisma/schema.prisma` tetap FROZEN sesuai tata kelola EEOS), struktur bab akan disimpan dalam format JSON terstruktur pada kolom `content`:

```typescript
export interface ChapterItem {
  id: string; // e.g. "bab-1", "bab-2"
  title: string; // e.g. "Bab 1: Ketentuan Pendaftaran & Rombongan"
  content: string; // HTML rich text isi bab
  order: number; // Urutan bab (1, 2, 3...)
}

export interface StructuredTermsDocument {
  isChapterMode: true;
  chapters: ChapterItem[];
}
```

**Backward Compatibility (Fallback Otomatis):**
- Jika nilai `content` berupa HTML string biasa (dokumen versi legacy), sistem reader di `/register` otomatis memperlakukannya sebagai 1 bab tunggal tanpa error.
- Helper `parseTermsChapters(content: string): ChapterItem[]` akan memvalidasi apakah `content` berbentuk JSON berstruktur bab atau HTML biasa.

---

### B. Admin CMS Builder Bab (`/admin/pengaturan/aturan-operasional`)
Pada form pembuatan dan pengeditan versi aturan operasional:
1. **Metadata Versi**: `Judul Dokumen` dan `Nomor Versi`.
2. **Manajemen Bab Interaktif**:
   - Tampilan daftar kartu Bab (`Bab 1`, `Bab 2`, dst.).
   - Tombol **+ Tambah Bab Baru**.
   - Setiap Bab memiliki:
     - Input teks **Judul Bab** (misal: `Bab 1: Persyaratan Dokumen & Pendaftaran`).
     - Editor konten **Isi Dokumen Bab** (Rich Text Editor).
     - Tombol **Hapus Bab** dan tombol **Pindah Urutan Atas / Bawah** (reorder).
3. **Validasi Form**: Mengharuskan minimal 1 bab terisi judul dan konten sebelum dokumen dapat disimpan atau diaktifkan.

---

### C. Alur Pembacaan & Persetujuan Jamaah (`/register` Step 2)
1. **Navigasi / Stepper Bab**:
   - Di bagian atas container Syarat & Ketentuan ditampilkan indikator langkah bab (contoh: *Bab 1 dari 4: Ketentuan Pendaftaran*).
   - Menampilkan status penyelesaian bab (sudah dicentang ditandai ikon hijau/checkmark).
2. **Konten Bab Aktif**:
   - Menampilkan isi teks/HTML hanya untuk bab yang sedang aktif.
3. **Persetujuan Per Bab & Transisi**:
   - Di bawah teks bab terdapat checkbox:
     `[✓] Saya telah membaca dan menyetujui isi [Judul Bab Aktif]`
   - Tombol navigasi:
     - **Bab Sebelumnya**: untuk meninjau kembali bab yang telah disetujui sebelumnya.
     - **Lanjut ke Bab Berikutnya**: baru aktif setelah checkbox bab saat ini dicentang.
4. **Penyelesaian Seluruh Bab**:
   - Setelah bab terakhir dicentang dan disetujui, status `termsAccepted` menjadi `true` dan tombol `Lanjut ke Jumlah Anggota Rombongan (Step 3)` otomatis aktif.

---

## 3. Dampak & Ruang Lingkup Perubahan

- **Admin CMS**: [src/app/admin/pengaturan/aturan-operasional/page.tsx](file:///d:/Projects/app-admin-vtu/src/app/admin/pengaturan/aturan-operasional/page.tsx)
- **Registrasi Jamaah Publik**: [src/app/register/page.tsx](file:///d:/Projects/app-admin-vtu/src/app/register/page.tsx)
- **Shared Helper Utility**: [src/shared/lib/terms-utils.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/terms-utils.ts) (parser JSON/HTML bab & validator)
- **Database Schema**: **Tidak ada perubahan** (`prisma/schema.prisma` tetap utuh).

---

## 4. Rencana Pengujian & Verifikasi

1. **Unit Test Utility Parser**: Pengujian serialisasi dan parsing bab dengan format JSON dan fallback teks biasa.
2. **Admin CMS Verification**: Menambah 3-4 bab dengan judul dan isi masing-masing, menyimpan, lalu memverifikasi dokumen termuat kembali saat diedit.
3. **Jamaah Registration Flow Verification**:
   - Simulasi alur pembacaan bab 1 -> centang bab 1 -> tombol lanjut aktif -> masuk bab 2 -> centang bab 2 -> sampai bab akhir.
   - Memastikan jamaah tidak dapat melewati bab tanpa mencentang persetujuan bab tersebut.
4. **Regression & Build Verification**: Menjalankan `npx vitest run` dan `npm run build` untuk menjamin zero error.
