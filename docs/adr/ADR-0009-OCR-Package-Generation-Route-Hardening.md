# ADR-0009: Hardening & Pembekuan Baseline OCR Generator Paket & Resolusi Rute Saudi (In-Out)

## Status
FROZEN & HARDENED (EEOS Baseline v1.2)

## Tanggal
2026-09-22

## Konteks
Modul **AI & OCR Generator Paket Umroh** (`src/server/services/package-ai/`) bertugas mengekstrak berkas flyer / caption promosi paket umroh dari travel operasional menjadi entitas paket, keberangkatan, harga klaster seat, varian split, dan rute penerbangan.

Sebelumnya, terdapat potensi deviasi pembacaan rute in-out Saudi Arabia dan inkonsistensi penanganan varian paket (split starting vs split promo/spek). Setelah serangkaian perbaikan presisi, akurasi pembacaan telah mencapai target 100% dan disetujui Product Owner untuk **dikunci (LOCKED & HARDENED)** guna mencegah degradasi atau regresi kode di masa mendatang.

## Keputusan Arsitektur & Hukum Domain (Invariants)

### 1. Hukum Inisial Rute In-Out Arab Saudi (Saudi Route Initial Law)
- Pada rute penerbangan di Arab Saudi: **Karakter inisial yang terletak setelah tanda strip/garis (`-`) SELALU menunjukkan RUTE KEPULANGAN / OUT jamaah dari Arab Saudi**.
- Nilai rute OUT secara ketat hanya terdiri dari dua kemungkinan:
  - **`J`** = Bandara Internasional King Abdulaziz, Jeddah (`JED`).
  - **`M`** = Bandara Internasional Pangeran Mohammad bin Abdulaziz, Madinah (`MED`).
- **Aturan Pemetaan**:
  - `J-M` (atau inisial `-M`): IN = Bandara Jeddah, OUT = Bandara Madinah $\rightarrow$ Kode Master: `JED.C-M` (atau `JED.TH-M` bila mencakup Thaif).
  - `M-J` (atau inisial `-J`): IN = Bandara Madinah, OUT = Bandara Jeddah $\rightarrow$ Kode Master: `MED-J`.
  - Pasangan segmen tiket IATA (`...-JED // MED-...` $\rightarrow$ `JED.C-M`, `...-MED // JED-...` $\rightarrow$ `MED-J`).
- **Prioritas Sumber Ekstraksi**:
  - Informasi rute wajib diprioritaskan diambil dari **Flyer Terakhir** atau **Flyer Sebelum Terakhir** (lembar itinerary penerbangan), baru kemudian caption pendukung.

### 2. Hukum Arsitektur Varian Paket (Package Variant Architecture Law)
- **Split Starting (Beda Kota/Bandara Keberangkatan Asal)**:
  - Otomatis membagi kuota seat dengan paket induk.
  - Memiliki entitas manifest tersendiri (`manifestId` independen).
  - Wajib menautkan `parentPackageId` di database backend dan ditampilkan dalam satu daftar terkelompok dengan paket induk pada laman manajemen.
- **Split Varian Promo & Split Varian Spek**:
  - **TIDAK** memisahkan manifest sendiri.
  - Tetap menjadi satu grup manifest bersama paket induk, karena keberangkatan, tanggal, dan penerbangannya identik, hanya berbeda benefit harga promo atau spesifikasi fasilitas kamar/hotel.

### 3. Hukum Normalisasi Judul Paket (Title Normalization Law)
- Label judul pada daftar paket hasil generate dibatasi secara konsisten hanya pada label resmi:
  - `"Umroh Reguler"`
  - `"Umroh Plus Turkiye"` / `"Umroh Plus Dubai"` / `"Umroh Plus Europa"`

### 4. Regression Test Gatekeeper
- Seluruh invariant di atas dilindungi oleh test suite otomatis di:
  `src/server/services/package-ai/__tests__/package-route-ocr.test.ts`
- Modifikasi apapun pada parser OCR di masa mendatang dilarang merusak test suite ini.

## Konsekuensi
- **Positif**:
  - Akurasi ekstraksi rute kepulangan jamaah terkunci 100% benar (Jeddah vs Madinah).
  - Menghilangkan resiko kesalahan pencatatan rute tiket pesawat dan penempatan bus ziarah di Saudi.
  - Pembagian seat split starting dan kesatuan manifest varian promo/spek terjaga di database.
- **Batasan**:
  - Setiap perubahan pada aturan ekstraksi rute wajib melalui proses Architecture Review dan persetujuan Product Owner (ADR Required).
