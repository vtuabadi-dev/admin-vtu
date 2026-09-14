# ADR-0019: Kriteria Paket Full Board (FB) vs Breakfast Only (BF), Ekstraksi Otomatis OCR & Visualisasi Manifest Jamaah

## Status
APPROVED (Product Owner & Architecture Review)

## Tanggal
2026-09-14

## Domain
Package Intelligence, OCR/AI Extraction Engine, Package Management & Manifest Jamaah

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks (Context)
Dalam operasional perjalanan ibadah umroh VTU Abadi, terdapat dua skema konsumsi/katering hotel yang disediakan bagi jamaah:
1. **Full Board (`FB`)**: Fasilitas makan 3x sehari (sarapan, makan siang, dan makan malam) yang telah termasuk dalam paket.
2. **Breakfast Only (`BF`)**: Fasilitas makan hanya sarapan pagi di hotel; makan siang dan malam tidak termasuk atau bersifat mandiri.

Sebelumnya:
- Sistem pembuatan paket belum memiliki indikator eksplisit untuk membedakan paket `FB` dan `BF`.
- AI/OCR caption extractor belum mengklasifikasikan tipe konsumsi ini dari flyer maupun teks caption sosial media.
- Pada tabel Manifest Data Jamaah (`/admin/manifest`), staf operasional tidak dapat langsung melihat apakah rombongan/jamaah tertentu mengambil paket Full Board atau Breakfast Only tanpa memeriksa rincian invoice secara manual.

---

## 2. Keputusan Arsitektur (Decision)

1. **Aturan Bisnis Ekstraksi Teks (OCR & Caption Intelligence)**:
   - **Kriteria Full Board (`FB`)**: Jika teks caption/flyer menyebutkan `"makan 3x1 hari"`, `"makan 3x sehari"`, `"3x sehari"`, `"full board"`, `"fullboard"`, atau `"FB"`, maka sistem secara otomatis menetapkan `tipeMakan = "FB"`.
   - **Kriteria Breakfast Only (`BF`)**: Jika teks caption/flyer TIDAK mencantumkan `"makan 3x1 hari"` dan mencantumkan `"breakfast only"`, `"bf"`, `"sarapan saja"`, atau `"hanya sarapan"`, maka sistem menetapkan `tipeMakan = "BF"`.
   - **Nilai Default**: Jika tidak terdapat keterangan spesifik, paket umroh reguler ditetapkan secara aman sebagai **`FB` (Full Board)**.

2. **Saklar Interaktif (Switch) pada Form Pembuatan Paket (`/admin/paket-umroh/generate`)**:
   - Disediakan tombol saklar switch `Tipe Konsumsi / Makan` pada:
     - **Mode Form Manual**: Staf dapat langsung memilih antara Full Board (`FB`) atau Breakfast Only (`BF`).
     - **Mode Review Hasil OCR**: Nilai terisi otomatis dari hasil ekstraksi Gemini AI / Regex Caption, dan tetap dapat disesuaikan manual via switch sebelum disimpan.
   - Posisi visual switch:
     - **ON (Emerald/Hijau)**: `Full Board (FB)`
     - **OFF (Amber/Oranye)**: `Breakfast Only (BF)`

3. **Penyimpanan Data Tanpa Destructive Migration (Zero-Downtime)**:
   - Data tipe makan disimpan ke dalam fasilitas paket (`include: string[]`):
     - `FB`: `"Makan 3x Sehari (Full Board / FB)"`
     - `BF`: `"Breakfast Only (BF)"`
   - Dilengkapi resolusi dinamis `resolvePackageBoardType(groupPkg, activePackage)` yang memeriksa atribut eksplisit maupun isi daftar `include`.

4. **Visualisasi Kolom Manifest Jamaah (`/admin/manifest`)**:
   - Menambahkan kolom **`TIPE MAKAN`** pada tabel data jamaah (ditempatkan setelah kolom `CITY TOUR THOIF` dan sebelum `HOTEL MAKKAH`).
   - Disajikan dengan badge kontras tinggi:
     - **`FB`**: Badge Emerald Hijau Zamrud (`bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold`) dengan tooltip *"Paket Full Board (Makan 3x Sehari)"*.
     - **`BF`**: Badge Amber (`bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold`) dengan tooltip *"Paket Breakfast Only (Sarapan Saja)"*.
   - Export Manifest Excel menyertakan identifikasi `[FB]` / `[BF]` pada nama rombongan/paket.

---

## 3. Konsekuensi (Consequences)
- Staf operasional dan handling bandara/hotel dapat langsung membedakan jamaah Full Board dan Breakfast Only pada tabel manifest.
- AI OCR mengekstrak tipe makan secara otomatis dari caption tanpa memerlukan input manual berulang.
- Skema data sepenuhnya kompatibel ke belakang (*backward compatible*). Paket lama yang tidak memiliki penanda otomatis teridentifikasi sebagai Full Board.
- Memenuhi kepatuhan **EEOS Governance Baseline v1.2** (Tier 1 Evidence).

---

## 4. Addendum: Aturan Kesetaraan Mutlak (Equivalence Mandate) Thoif == Thaif

### Latar Belakang & Mandat Pengguna
Ditemukan inkonsistensi fonetik di mana penulisan nama kota tujuan ziarah/wisata di Arab Saudi dalam flyer dan caption sering bergantian antara **"Thaif"** (transliterasi fonetis standar bahasa Arab طائف) dan **"Thoif"** (vokalisasi populer di Indonesia). Mandat eksplisit menyatakan:
> *"Dengan kata ini: 'Free city tour Thoif' jangan menganggap dengan kata ini 'Free city tour Thaif' suatu kata yang berbeda hanya karena yang awal pakai o, dan yang kedua pakai a. Maka anggap keduanya yaitu Thoif/Thaif adalah suatu kata yang sama."*

### Keputusan Implementasi
1. **Gemini AI Prompt & Schema Mandate**:
   - Menambahkan klausul `ATURAN KESETARAAN MUTLAK (EQUIVALENCE MANDATE)`: AI dilarang membedakan kata "Thoif" dan "Thaif".
   - Frasa `"Free city tour Thaif"`, `"Free city tour Thoif"`, `"City Tour Thaif"`, `"City Tour Thoif"`, `"Free Thaif"`, `"Free Thoif"`, `"Ziarah Thaif"`, `"Ziarah Thoif"` **SUDAH DIPASTIKAN** menghasilkan `isAdaThoif = "ya"`.
2. **Deterministic Section & Regex Parser Engine**:
   - `extractThoifStatus()` pada `caption-parser.ts` dan `caption-section-parsers.ts` menggunakan pola regex komprehensif `/th[ao]'?if|ta'?if|toif|thowif|thayif/i`.
   - Modul `alias-resolver.ts` menyediakan konstanta `THOIF_THAIF_SYNONYMS` dan fungsi pendeteksi `isThoifSynonym()` / `containsThoifOrThaif()`.
   - Menggunakan prinsip *union-fallback* di `generate/page.tsx`: deteksi positif pada caption atau OCR flyer langsung mengaktifkan saklar `isAdaThoif = "ya"` tanpa dapat dibatalkan oleh AI extraction yang gagal/null.
3. **Penyelarasan UI & Manifest**:
   - Saklar pada Form Pembuatan Paket (mode manual & OCR) dinamai eksplisit: `Termasuk City Tour Thoif / Thaif?`.
   - Kolom tabel Manifest Jamaah dan Manifest Pembayaran dinamai: `CITY TOUR THOIF / THAIF`.
4. **EEOS Compliance**:
   - Status: CONFIRMED (Tier 1 Evidence).
