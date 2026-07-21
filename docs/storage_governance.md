# Storage Governance & File Naming Policy

Dokumen ini mendefinisikan standar pengorganisasian folder (direktori) dan konvensi penamaan file untuk seluruh dokumen dan berkas yang diunggah ke Google Drive (atau Object Storage lainnya) pada aplikasi VTU Operasional.

---

## 1. Arsitektur Penyimpanan
Aplikasi memisahkan penyimpanan data menjadi dua kategori:
1. **Data Transaksional & Referensi (Tabel)**: Disimpan di PostgreSQL (Supabase) via Prisma.
2. **Berkas Fisik (Dokumen/File)**: Disimpan di **Google Drive** menggunakan Service Account OAuth API. File system server lokal bersifat *read-only* (Vercel serverless) dan tidak boleh digunakan untuk menyimpan file permanen.

---

## 2. ID Paket & Kode Paket (Package Identity System)

### 2.1 ID Paket (Single Source of Truth)
Setiap paket keberangkatan memiliki `id` yang unik dan permanen, dibuat secara otomatis oleh database menggunakan CUID. ID ini adalah **Single Source of Truth** untuk setiap paket — tidak pernah berubah meskipun nama, tanggal, atau kode paket berubah. Seluruh modul (manifest, registrasi jamaah, rooming, dll.) mereferensikan paket menggunakan `id` ini.

### 2.2 Kode Paket Individual (`kodeIndividu`)
Setiap keberangkatan memiliki satu kode paket individual yang dibentuk secara otomatis oleh sistem. Kode ini bersifat **unik** dan digunakan sebagai identifikasi publik paket.

**Formula:**

*Paket Reguler (REG):*
```
#{TAHUN}_{DURASI}H_{KODE_KOTA_ASAL}_{KODE_MASKAPAI}_{BULAN_ENG}{TANGGAL_2DIGIT}
```

*Paket Plus (non-REG):*
```
#{TAHUN}_{DURASI}H_{KODE_JENIS_PAKET}_{KODE_KOTA_ASAL}_{KODE_MASKAPAI}_{BULAN_ENG}{TANGGAL_2DIGIT}
```

**Ketentuan:**
- Paket `REG` → IDENTIFIER = Kode Kota Asal saja (karena tipe paket generik, pembedanya adalah kota asal)
- Paket Plus (`DUB`, `TUR`, `EUR`, dll.) → Kode Jenis Paket **lalu** Kode Kota Asal (karena satu jenis Plus bisa berangkat dari beberapa kota berbeda)

**Singkatan Bulan (Bahasa Inggris, 3 Huruf):**

| Bulan | Singkatan |
|-------|-----------|
| Januari | JAN |
| Februari | FEB |
| Maret | MAR |
| April | APR |
| Mei | MAY |
| Juni | JUN |
| Juli | JUL |
| Agustus | AUG |
| September | SEP |
| Oktober | OCT |
| November | NOV |
| Desember | DEC |

**Contoh Kode Individual:**

| Paket | Kota Asal | Kode |
|-------|-----------|------|
| Umroh Plus Turkiye, 15 hari, Jakarta, Saudia, 5 Agustus 2026 | JKT | `#2026_15H_TUR_JKT_SV_AUG05` |
| Umroh Plus Turkiye, 15 hari, Jakarta, Saudia, 27 Agustus 2026 | JKT | `#2026_15H_TUR_JKT_SV_AUG27` |
| Umroh Plus Turkiye, 15 hari, Surabaya, Saudia, 5 Agustus 2026 | SBY | `#2026_15H_TUR_SBY_SV_AUG05` |
| Umroh Plus Dubai, 11 hari, Jakarta, Emirates, 5 Juli 2026 | JKT | `#2026_11H_DUB_JKT_EK_JUL05` |
| Umroh Reguler Jakarta, 12 hari, Emirates, 10 Sep 2026 | JKT | `#2026_12H_JKT_EK_SEP10` |
| Umroh Reguler Jakarta, 9 hari, Saudia, 6 Jan 2027 | JKT | `#2027_9H_JKT_SV_JAN06` |

### 2.3 Kode Paket Grup (`kodeGrup`)
Kode grup adalah kode payung yang menghubungkan beberapa keberangkatan yang disubmit bersama dalam satu grup. Kode ini bersifat **opsional** — hanya ada jika satu submit mencakup lebih dari satu tanggal keberangkatan.

**Formula:**

*Paket Reguler (REG):*
```
#{TAHUN}_{DURASI}H_{KODE_KOTA_ASAL}_{KODE_MASKAPAI}_{BULAN1}_{BULAN2}_...
```

*Paket Plus (non-REG):*
```
#{TAHUN}_{DURASI}H_{KODE_JENIS_PAKET}_{KODE_KOTA_ASAL}_{KODE_MASKAPAI}_{BULAN1}_{BULAN2}_...
```

Bulan-bulan yang muncul di kode grup adalah **daftar bulan unik** dari semua tanggal keberangkatan dalam grup tersebut, diurutkan secara kronologis tanpa duplikasi.

**Contoh Kode Grup:**

| Paket | Kota Asal | Bulan-Bulan | Kode Grup |
|-------|-----------|-------------|----------|
| Plus Turkiye 2026, Jakarta, Saudia, 10 tanggal Agu-Nov | JKT | AUG, SEP, OCT, NOV | `#2026_15H_TUR_JKT_SV_AUG_SEP_OCT_NOV` |
| Plus Turkiye 2026, Surabaya, Saudia, 5 tanggal Agu-Sep | SBY | AUG, SEP | `#2026_15H_TUR_SBY_SV_AUG_SEP` |
| Reguler Jakarta 2027, Saudia, Jan-Feb | JKT | JAN, FEB | `#2027_9H_JKT_SV_JAN_FEB` |

### 2.4 Aturan Generate Kode Otomatis
Kode paket dibuat secara otomatis oleh sistem pada saat paket disubmit (bukan dibuat manual oleh admin). Aturannya:

1. **Submit 1 tanggal** → hanya menghasilkan `kodeIndividu`. Kolom `kodeGrup` dan `paketGrupId` bernilai `null`.
2. **Submit > 1 tanggal** → sistem membuat satu record `PaketGrup` dengan `kodeGrup` sebagai payung, lalu setiap tanggal mendapatkan `kodeIndividu` masing-masing, dan seluruhnya terhubung ke `PaketGrup` melalui kolom `paketGrupId`.
3. Kode **tidak boleh diubah manual** setelah dibuat. Jika durasi atau maskapai berubah signifikan, kode harus diregenerasi dan kode lama diarsipkan.

---

## 3. Struktur Direktori Google Drive (Folder Hierarchy)
Seluruh berkas dokumen jamaah dan pembayaran wajib diatur secara bertingkat di dalam Google Drive untuk mencegah penumpukan file acak di root folder.

Struktur folder didefinisikan sebagai berikut:

```text
Root/
├── KELENGKAPAN DATA JAMAAH/
│   └── [TAHUN]/
│       └── [BULAN]/
│           └── [NAMA_FOLDER_PAKET]/
│               ├── PASPOR/
│               │   └── {NomorManifest}-{KodeJamaah}_{NAMA-JAMAAH}.{ext}
│               ├── KTP/
│               ├── FOTO/
│               ├── PEMBAYARAN/
│               ├── DOKUMEN LAIN/
│               ├── MANIFEST/
│               └── EXPORT/
├── FLYER PAKET/
│   └── [TAHUN]/
│       └── [BULAN]/
│           └── [NAMA_FOLDER_PAKET]/
├── WAKAF DAN BADAL/
│   └── [TAHUN]/
│       └── [BULAN]/
│           └── [NAMA_FOLDER_PAKET]/
└── HOTEL/
    └── (tanpa subfolder tahun/bulan)
```

### Parameter Direktori:
- **`[TAHUN]`**: Tahun keberangkatan paket (contoh: `2027`).
- **`[BULAN]`**: Bulan keberangkatan paket dengan format dua digit angka urut dan nama bulan bahasa Indonesia dalam huruf kapital (contoh: `01-JANUARI`, `02-FEBRUARI`, ..., `12-DESEMBER`).
- **`[NAMA_FOLDER_PAKET]`**: Nama folder paket keberangkatan yang dibentuk secara otomatis oleh sistem dengan formula terstandarisasi.

---

## 4. Standardisasi Nama Folder Paket

Nama folder untuk setiap paket keberangkatan (`[NAMA_FOLDER_PAKET]`) wajib dibentuk dengan formula berikut:

```text
[KODE_KOTA_ASAL] - [TANGGAL_BERANGKAT_SINGKAT] [DURASI] H [KODE_JENIS_PAKET] ([KODE_MASKAPAI])
```

### Komponen Formula:
1. **`[KODE_KOTA_ASAL]`**: Kode bandara/kota keberangkatan dalam huruf kapital (contoh: `JKT`, `SBY`). Diambil dari `startingPoint.code`.
2. **`[TANGGAL_BERANGKAT_SINGKAT]`**: Tanggal hari (2 digit) dan singkatan bulan (3 huruf kapital) keberangkatan dalam bahasa Indonesia (contoh: `02 AGT`, `05 JAN`). Gunakan singkatan: `JAN`, `FEB`, `MAR`, `APR`, `MEI`, `JUN`, `JUL`, `AGT`, `SEP`, `OKT`, `NOV`, `DES`.
3. **`[DURASI] H`**: Jumlah hari durasi paket diikuti huruf "H" (contoh: `9 H`, `15 H`). Diambil dari `durationDays`.
4. **`[KODE_JENIS_PAKET]`**: Kode jenis paket dari master konfigurasi (contoh: `REG`, `TUR`, `DUB`, `EUR`). Diambil dari `packageType.code`. **Dilarang** menuliskan nama panjang seperti `PLUS TURKI`.
5. **`([KODE_MASKAPAI])`**: Kode maskapai dalam kurung (contoh: `(SV)`, `(EK)`, `(BI)`). Diambil dari `maskapaiMaster.code`.

**Contoh:**
- `JKT - 27 AGT 15 H TUR (SV)` ✅
- `SBY - 29 AGT 9 H REG (BI)` ✅
- `JKT - 27 AGT 15 H PLUS TURKI (SV)` ❌ (nama panjang dilarang)

---

## 5. Konvensi Penamaan Berkas (File Naming Convention)

Setiap file dokumen yang diunggah oleh jamaah wajib diganti namanya oleh server menggunakan format berikut:

```text
{NomorManifest}-{KodeJamaah}_{NAMA-JAMAAH}.{ext}
```

### Komponen Penamaan Berkas:
- **`{NomorManifest}`**: Nomor urut manifest jamaah 3 digit dengan zero padding (contoh: `001`, `011`). Jika jamaah belum masuk manifest, gunakan default `000`.
- **`{KodeJamaah}`**: `registrationId` permanen jamaah (contoh: `GRP-2026-00001-1`). Spasi diganti tanda hubung (`-`).
- **`{NAMA-JAMAAH}`**: Nama lengkap jamaah dalam UPPERCASE. Spasi diganti tanda hubung (`-`).
- **`{ext}`**: Ekstensi file dalam huruf kecil (contoh: `jpg`, `pdf`).

**Contoh:**
- `011-GRP-2026-00001-1_FIRMAN-BIN-ABDULLAH.jpg`
- `001-GRP-2026-00001-1_AHMAD-BIN-ALI.pdf`

---

## 6. Kebijakan Keamanan & Sanitasi Jalur Berkas
1. **Sanitasi Path**: Semua komponen folder wajib disanitasi menggunakan regex `/[^a-zA-Z0-9_\-\s]/g`.
2. **Google Drive Registry**: ID folder Google Drive disimpan di kolom `driveFolderIds Json?` pada tabel `keberangkatan` agar tidak perlu mencari folder ulang di setiap upload.
3. **Penyimpanan ID File**: Yang disimpan di database adalah **Google Drive File ID** unik, bukan path teks.

---

## 7. Mutasi Berkas (Transfer Paket)
Jika jamaah melakukan transfer paket keberangkatan:
1. Berkas **tidak diunggah ulang**.
2. Sistem memindahkan file fisik via Google Drive API ke folder paket baru.
3. Nama berkas diperbarui menyesuaikan `NomorManifest` yang baru di paket tujuan.
