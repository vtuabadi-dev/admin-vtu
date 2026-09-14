# ADR-0020: Arsitektur Detail Flight Multi-Segment, PNR Rombongan, Ekstraksi AI OCR (Gambar & PDF), dan Pewarisan Split Starting Keberangkatan

## Status
APPROVED (Product Owner & Architecture Review)

## Tanggal
2026-09-14

## Domain
Package Management, Departure Operations, Flight Intelligence, AI OCR & Manifest

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks (Context)
Dalam operasional perjalanan ibadah umroh VTU Abadi:
1. **Penerbangan Umrah Bersifat Multi-Segmen**:
   - Penerbangan dapat berupa penerbangan langsung (*direct*) maupun transit (*multi-leg*, misal: Royal Brunei via BWN, Qatar via DOH, Emirates via DXB).
   - Menjelang keberangkatan, informasi resmi maskapai (kode booking PNR, nomor penerbangan per rute, jam lepas landas dan tiba) diterbitkan dalam bentuk berkas tiket resmi (PDF e-ticket) maupun screenshot/foto fisik.
2. **Kebutuhan Data Susulan & Isolasi Generate Paket**:
   - Pembuatan paket awal (`/admin/paket-umroh/generate`) bersifat independen. Rute In-Out yang sudah tergenerate bersifat tetap (*immutable*) dan tidak boleh terganggu oleh pembangunan detail penerbangan.
   - Detail flight adalah data susulan (*enrichment supplementary data*) yang dilengkapi pada modul Manajemen Keberangkatan.
3. **Pewarisan & Penambahan Segmen pada Paket Split Starting**:
   - Paket pecahan split starting (`splitReason === "starting_point"`) memiliki kebutuhan penerbangan internasional utama yang sama dengan paket induk, namun dapat memiliki penerbangan tambahan (*feeder flight*, misal Surabaya &rarr; Jakarta sebelum terbang ke Saudi).
4. **Kebutuhan Otomasi Input**:
   - Memasukkan data 7 kolom per segmen penerbangan secara manual rentan kesalahan ketik (*human error*). Diperlukan fitur AI OCR yang mampu membaca file Gambar maupun dokumen PDF dan langsung memposisikan data ke dalam tabel secara presisi.

---

## 2. Keputusan Arsitektur (Decision)

1. **Zero Impact pada Generate Paket & Rute In-Out**:
   - Seluruh pipeline generate paket (manual maupun OCR) tetap beroperasi seperti semula tanpa perubahan alur atau skema wajib.
   - Nilai rute In-Out tidak diubah dan tetap menjadi acuan utama jadwal.

2. **Dukungan Ekstraksi AI OCR Multiformat (Image & PDF)**:
   - Disediakan endpoint `POST /api/keberangkatan/flight-ocr` berbasis Google Gemini 2.0 Flash Vision.
   - Menerima file `image/*` (PNG, JPG, JPEG, WEBP) dan dokumen `application/pdf` (E-ticket resmi maskapai multi-halaman).
   - Ekstraksi terstruktur menghasilkan:
     - `pnrMain`: Kode booking utama / PNR.
     - `segments`: Daftar segmen penerbangan terurut memuat `tanggal`, `kodeFlight`, `pnr`, `asal`, `tujuan`, `jamBerangkat`, dan `jamTiba`.

3. **Auto-Populate ke Tabel 7 Kolom**:
   - Hasil ekstraksi OCR langsung memetakan nilai ke state baris tabel `flightSegments` di halaman edit keberangkatan (`/admin/keberangkatan/[id]/edit`).
   - Admin memiliki kebebasan memeriksa dan mengedit manual data di tabel sebelum menyimpan ke database.

4. **Logika Pewarisan & Penambahan Split Starting**:
   - Paket split starting otomatis memuat segmen penerbangan dari paket induk (`parentKeberangkatanId`).
   - Jika admin mengunggah tiket feeder untuk split starting, sistem OCR menyediakan opsi penambahan (*append*) segmen ke dalam tabel tanpa menimpa data penerbangan internasional induk.

5. **Format Penyimpanan Kompatibel (Zero Schema Migration)**:
   - Data disimpan ke dalam metadata JSON `flightDetails` pada tabel `Keberangkatan` (`driveFolderIds.flightDetails`) sehingga tidak memerlukan migrasi destruktif pada database schema Prisma.

---

## 3. Konsekuensi (Consequences)
- Efisiensi staf operasional meningkat drastis karena pengisian jadwal penerbangan cukup dengan mengunggah gambar/PDF e-ticket.
- Menghilangkan risiko galat ketik jam dan kode bandara.
- Paket split starting memiliki data penerbangan feeder dan induk yang terintegrasi secara rapi.
- Memenuhi standar tata kelola **EEOS Governance Baseline v1.2** (Tier 1 Evidence).
