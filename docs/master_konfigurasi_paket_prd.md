# Product Requirements Document (PRD): Master Konfigurasi Paket

## 1. Overview
Master Konfigurasi Paket adalah submenu tunggal di bawah menu "Master Data" pada fase ini. Fitur ini mengelola konfigurasi referensi utama yang digunakan dalam pembuatan Paket Umroh. Sesuai regulasi *Master Data Governance*, entitas ini menggunakan prinsip *No Hard Delete* (Aksi hanya sebatas Create, Update, Aktif, dan Nonaktif).

## 2. Scope & Menu Structure
Navigasi menu terpusat pada:
- **Master Data**
  └── **Master Konfigurasi Paket**

Master Konfigurasi Paket akan memiliki beberapa Tab konfigurasi berikut:

### Tab 1. Jenis Paket
Digunakan sebagai label klasifikasi (tipe) paket.
- Default *seed*: Paket Reguler.
- Admin dapat menambahkan kategori baru tanpa batasan (contoh: Paket Plus Turkiye, Paket Plus Dubai, Paket Plus Brunei, dll).

### Tab 2. Starting Point
Titik awal dimulainya keberangkatan jamaah.
- Admin dapat menambahkan data kota secara bebas.
- Contoh pengisian: Jakarta, Surabaya, Solo, Makassar, Medan, dst.

### Tab 3. Lama Perjalanan
Durasi operasional paket dalam hari.
- Admin dapat menambahkan data durasi secara bebas.
- Contoh pengisian: 9 Hari, 10 Hari, 12 Hari, 13 Hari, dst.

### Tab 4. Maskapai Internasional
Mengelola referensi nama maskapai penerbangan internasional yang digunakan.
- Wajib memiliki field **Kode Maskapai** (unik) dan **Nama Maskapai**.
- Contoh: 
  - SV - Saudia Airlines
  - GA - Garuda Indonesia
  - EK - Emirates
  - QR - Qatar Airways
- Admin dapat menambahkan maskapai baru jika diperlukan.

### Tab 5. Pola Landing (Business Journey Pattern)
Mengatur *Business Journey Pattern* rute kedatangan dan kepulangan yang akan menentukan alur logistik jamaah di Saudi Arabia. Harus sangat fleksibel namun memiliki nilai default wajib sebagai berikut:
- **REGULER**: `JED.C-M`, `JED.C-J`, `JED.D-M`, `JED.D-J`
- **UMROH DAHULU**: `UD.C-M`, `UD.C-J`, `UD.D-M`, `UD.D-J`
- **TOUR DAHULU**: `TD.C-M`, `TD.C-J`, `TD.D-M`, `TD.D-J`
Admin diberikan kewenangan penuh untuk mendaftarkan kategori Landing Pattern baru apabila diperlukan di masa depan.

### Tab 6. Kategori Perlengkapan
Tab ini BUKAN berisikan list inventaris fisik barang. Tab ini difungsikan murni sebagai **LABEL** atau "kelas perlengkapan" dari paket.
- Contoh Label: Basic, Silver, Gold, Platinum, VIP.
- Detail barang (seperti jenis koper, kain ihram) akan diatur tersendiri pada entitas *Master Konfigurasi Perlengkapan* di waktu mendatang.
