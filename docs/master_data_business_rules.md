# Master Data Business Rules

Dokumen ini mengatur seluruh aturan bisnis Fundamental dan Standard Governance yang berlaku mutlak untuk seluruh ekosistem Master Data di VTU ABADI.

## 1. Aturan Master Data
- Master Data adalah *Configuration Center* utama sistem dan bertindak sebagai *Single Source of Truth*.
- Master Data secara bisnis **BUKAN** merupakan data transaksi.
- Modul transaksi tidak diperbolehkan menyimpan nilai *hardcoded text* dari opsi konfigurasi. Transaksi harus menyimpan *Foreign Key* ID yang merujuk pada Master Data yang valid.

## 2. Aturan Larangan Hard Delete
- DILARANG KERAS mengeksekusi operasi penghapusan fisik (*Hard Delete* atau SQL `DELETE`) terhadap record di tabel Master Data apa pun alasannya.

## 3. Aturan Master Data Lifecycle
Siklus ketersediaan data dikontrol sepenuhnya melalui status: `Aktif` dan `Nonaktif`.

### A. Aturan Status Aktif
- Data Master yang berstatus **Aktif** akan dimuat, muncul, dan dapat dipilih (selectable) sebagai opsi pada seluruh form input atau transaksi pembuatan data baru (contoh: pada form `Pembuatan Paket Umroh Baru`).

### B. Aturan Status Nonaktif
- Data Master yang berstatus **Nonaktif** TIDAK BOLEH tampil dan dilarang dipilih (*disabled / hidden*) saat admin membuat transaksi atau form data baru.
- Hal ini mewajibkan seluruh modul frontend dan endpoint API untuk menerapkan *query filter* (contoh: `status = aktif`) ketika *fetching* data referensi untuk sebuah inputan baru.

## 4. Aturan Penggunaan pada Transaksi & Referensi Historis
- Apabila sebuah transaksi di masa lalu telah mengikat Data Master tertentu, dan suatu hari Data Master tersebut diubah statusnya menjadi **Nonaktif**, maka transaksi historis masa lalu tersebut WAJIB tetap valid.
- Semua relasi *Foreign Key* pada tabel transaksi dilarang rusak.
- Reporting System, Invoice, Histori Audit, dan halaman Detail Transaksi harus tetap mampu menampilkan teks, *label*, maupun deskripsi dari Master Data tersebut secara normal. Laporan tidak boleh *broken* karena referensinya sedang berstatus Nonaktif.
