# ADR-0021: Single Manifest, Penyatuan Kuota, dan Integrasi Varian Paket pada Pemilihan Kamar & Manifest

## Status
APPROVED (Product Owner Approved with Soft Purple Row Accent)

## Tanggal
2026-10-02

## Domain
Package Management, Departure Operations, Registration Flow, Manifest, Billing & Rooming

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks & Permasalahan (Context & Problem Statement)

1. **Duplikasi Entitas Paket & Kuota Double**:
   - Pada implementasi sebelumnya, fitur *Generate Split Varian* (`splitType: "promo"` atau `splitType: "spek"`) mengeksekusi pembuatan entitas `Keberangkatan` baru di database dengan kode berakhiran `_V2`, `_V3`, dll.
   - Dampaknya, paket dengan penerbangan dan tanggal yang sama (contoh nyata: paket 03 Desember dan 06 Desember 2026) memiliki 2 record terpisah di tabel `keberangkatan`.
   - Kuota kursi menjadi dobel (misal kuota pesawat 45 pax dihitung 45 pax di paket induk + 45 pax di paket varian = 90 pax), padahal penerbangan dan kapasitas fisik seat pesawat adalah satu kesatuan (shared pool 45 pax).

2. **Pemisahan Manifest & Pemecahan Kwitansi**:
   - Karena entitas `Keberangkatan` terpisah, sistem otomatis menghasilkan Manifest independen untuk masing-masing keberangkatan.
   - Jamaah yang memilih varian spesifikasi (misal: Tanpa Perlengkapan) terpisah ke manifest yang berbeda, padahal mereka berangkat dalam rombongan pesawat yang sama.
   - Transaksi pendaftaran grup dan kwitansi pembayaran menjadi terpecah antar paket, menyulitkan rekonsiliasi keuangan dan operasional lapangan.

3. **Duplikasi Dropdown Registrasi**:
   - Pada portal pendaftaran jamaah (`/register`), dropdown pemilihan paket menampilkan daftar duplikat untuk tanggal yang sama (misal muncul dua pilihan untuk 03 Desember: satu paket reguler dan satu paket varian `[Tanpa Perlengkapan (Saja)]`), yang membingungkan calon jamaah/agen.

---

## 2. Keputusan Arsitektur (Decision)

1. **Konsolidasi Entitas: 1 Penerbangan = 1 Paket Keberangkatan = 1 Manifest**:
   - **Split Starting Point**: Tetap diperkenankan memecah kuota (`splitReason: "starting_point"`) karena melibatkan titik keberangkatan/feeder flight berbeda (misal Jakarta vs Surabaya).
   - **Split Varian (Spek / Promo / Hotel / Fasilitas)**: **DILARANG** membuat entitas `Keberangkatan` baru. Varian dikonsolidasikan langsung ke dalam paket keberangkatan induk sebagai opsi varian/klaster hotel bertingkat (*multi-cluster/variant options*).
   - Kuota kapasitas (`kuota`, `terisi`, `sisa`) dikelola dalam **1 shared seat pool** pada paket keberangkatan tersebut.

2. **Integrasi Pemilihan Varian pada Alur Registrasi (`/register`)**:
   - Dropdown pilihan paket hanya menampilkan **1 paket tunggal** untuk tanggal dan penerbangan tersebut.
   - Opsi varian (misal: *Varian Utama: Termasuk Perlengkapan* vs *Varian 2: Tanpa Perlengkapan / Hotel Bintang 5*) disajikan pada modul **Pemilihan Klaster / Kamar**, mirip dengan pemilihan klaster hotel (Silver / Gold / Platinum).
   - Setiap varian membawa harga base tersendiri, detail hotel Mekkah & Madinah, dan konfigurasi fasilitas (misal: otomatis mengeset status perlengkapan menjadi `TANPA` jika memilih varian Tanpa Perlengkapan).

3. **Single Manifest dengan Tanda Pembeda Varian & Aksen Deret Ungu Soft**:
   - Seluruh jamaah dari paket utama maupun variannya tergabung dalam **SATU Manifest** yang sama.
   - Pada baris data manifest (`ManifestRow` dan tampilan UI `/admin/manifest`), disediakan kolom/badge pembeda yang tegas dan jelas:
     - Badge **Varian Utama** (default neutral/amber)
     - Badge **Varian 2 / Spek** berwarna ungu (`bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700`)
   - **Styling Deret (Row Highlight)**: Seluruh deret baris pada tabel manifest untuk jamaah Varian 2 diberi warna latar belakang **ungu soft** (misal: `bg-purple-50/70 dark:bg-purple-950/20 border-l-4 border-l-purple-500 hover:bg-purple-100/70`) sehingga secara visual langsung kontras dan jelas membedakan jamaah Varian 2 dengan Varian Utama.
   - Tanda pembeda dan keterangan varian ini juga tercetak pada ekspor PDF maupun Excel Manifest agar petugas operasional dan handling bandara mengetahui spesifikasi layanan jamaah bersangkutan secara instan.

4. **Integrasi Billing & Kwitansi Utuh**:
   - Kwitansi, invoice grup, dan pembayaran tetap berada di bawah satu grup registrasi dan satu paket keberangkatan, mencegah pemecahan kwitansi.

5. **Migrasi & Pembersihan Data Eksisting**:
   - Melakukan konsolidasi terhadap data paket 03 Desember dan 06 Desember 2026:
     - Paket Varian V2 03 Des (`#2026_9H_JKT_QR_DEC03_V2`) dilebur ke dalam paket induk 03 Des (`#2026_9H_JKT_QR_DEC03`) sebagai varian ke-2 pada `hotelOptions`.
     - Relasi grup pendaftaran eksisting (Grup IRFAN - 2 pax) dipindahkan ke paket induk dengan penanda varian yang sesuai.
     - Record duplikat V2 dihapus dari database.

---

## 3. Evidence & Standar EEOS

### Evidence Used
- **E-001 (Source Code Inspection)**: `src/app/admin/paket-umroh/generate/page.tsx` (baris 565-675) memanggil `POST /api/keberangkatan` yang membuat baris baru di tabel `keberangkatan` untuk split varian promo/spek.
- **E-002 (Database Query Result)**: Query tabel `keberangkatan` membuktikan adanya 2 baris paket independen untuk tanggal 03 Des (`cmumeamk10004pt44i9295z69` dan `cmunmz4cp000313uy1m7ll969`) serta 06 Des (`cmumeasbd0006pt44fxntxbcq` dan `cmunmzcdq000513uyg64v6zr1`), masing-masing berkouta 45 pax sehingga total tercatat 90 pax.
- **E-003 (Registration Logic Inspection)**: `src/app/register/page.tsx` memuat opsi klaster hotel dari `selectedPaket.hotelOptions`, membuktikan bahwa mekanisme variasi fasilitas sudah didukung di level pemilihan klaster/kamar.

### Evidence Tier
- Tier 1 (Database Query, Source Code Inspection, Runtime Architecture Trace)

### Confidence Level
- **CONFIRMED**

### Implementation Recommendation
- **Waiting Product Owner Approval** (Sesuai EEOS Baseline v1.2 Pasal 12 & Pasal 7: Coding baru boleh dilakukan setelah ADR disetujui Product Owner).

---

## 4. Konsekuensi (Consequences)

### Positif:
1. Menghilangkan risiko *overselling* / kesalahan hitung kuota kursi penerbangan.
2. Manifest rombongan penerbangan 100% tunggal, mempermudah pelaporan maskapai dan penanganan bandara (handling).
3. Kwitansi dan tagihan grup tidak terpecah.
4. Tampilan halaman registrasi jauh lebih rapi, terstruktur, dan tidak membingungkan pengguna.

### Rencana Tindak Lanjut Setelah Approval:
1. Modifikasi `handleGenerateSplitVariant` pada generator paket agar memperbarui/menambahkan klaster/varian ke paket induk alih-alih membuat entitas baru.
2. Penyelarasan modul registrasi (`/register`) agar menampilkan kartu pilihan varian/klaster secara terpadu.
3. Penambahan badge visual varian pada tabel Manifest (`/admin/manifest`).
4. Eksekusi script migrasi data untuk merapikan paket duplikat 03 dan 06 Desember 2026.
