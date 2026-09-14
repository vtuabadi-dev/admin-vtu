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
