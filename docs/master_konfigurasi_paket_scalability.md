# Future Scalability & Roadmap

## 1. Configuration Extensibility
Arsitektur Configuration Center mendasarkan pada prinsip *Highly Decoupled*. Ketika bisnis mengekspansi layanannya, modul transaksi yang baru (misal: Transaksi Haji Khusus, Tour Edukasi) tetap dapat menggunakan kerangka Master Data yang telah solid ini tanpa perombakan skema tabel inti.

## 2. Roadmap Rekomendasi: Master Hotel
Pada fase/sprint roadmap selanjutnya, sangat disarankan untuk membangun **Master Hotel** di dalam menu *Master Data*.

### Rekomendasi Struktur & Field Master Hotel:
Sistem diinstruksikan untuk dirancang sesederhana mungkin. Field yang dibutuhkan hanya:
- `nama_hotel` (String)
- `kota` (Pilihan terbatas: Makkah / Madinah)
- `status_aktif` (Boolean)

### Dokumentasi Alasan Arsitektural:
Field pendukung seperti *Bintang, Lokasi, Nama Vendor, Koordinat Google Maps, Jarak ke Masjid, dan Kontak Eksternal* **TIDAK DIBUTUHKAN** pada rancangan saat ini. Keputusan arsitektural ini diambil berdasarkan pemetaan proses bisnis yang berjalan, di mana Master Hotel saat ini hanya berfungsi sebagai *identifier* alokasi penginapan jamaah. Penambahan field ekstra (*over-engineering*) di saat belum ada *use case* transaksional hanya akan menyulitkan *data entry* dari Admin (berpotensi menjadi data usang / *stale data*) tanpa memberikan Return of Investment (ROI) fungsional yang berarti.

## 3. Future Roadmap Development
Fase berikutnya setelah *Master Konfigurasi Paket* ini terimplementasi sempurna:
- Peluncuran Master Hotel.
- Peluncuran Master Konfigurasi Perlengkapan (Itemisasi fisik berdasarkan Kategori Perlengkapan).
- Integrasi menu Master Data dengan ekosistem pelaporan Global (Reporting System).
