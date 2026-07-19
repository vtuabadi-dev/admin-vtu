# Business Workflow: Generate Paket to Order Jamaah

## Tahap 1: Inisialisasi Master Data
1. Admin Master mengatur seluruh opsi referensi di modul Configuration Center (Master Konfigurasi Paket, Master Klaster, Master Hotel).

## Tahap 2: Proses Generate Paket Umroh
2. Product Manager / Admin Paket membuka halaman "Generate Paket".
3. Melewati *Wizard UI* (Memilih Master Data, menentukan Multi-Tanggal, menentukan Klaster + Hotel + Harga per Klaster).
4. Klik *Generate*.
5. Sistem melahirkan *X* buah data `Paket Keberangkatan` yang independen di database (berdasarkan jumlah tanggal).

## Tahap 3: Publikasi dan Order Jamaah
6. Paket yang telah di-generate muncul di Katalog Penjualan (Internal / B2B / B2C).
7. Sales melayani pendaftaran (Order Jamaah) dan memilih salah satu `Paket Keberangkatan`.
8. Sales menginput data Jamaah dan memilih Klaster (misal: Gold).
9. Secara default, sistem mengambil Hotel Makkah & Madinah dari definisi Klaster Gold pada paket tersebut.
10. **Hotel Override (Upgrade/Downgrade)**: Apabila Jamaah *request* pindah hotel, Sales mencentang opsi "Override Hotel", memilih Master Hotel alternatif, dan menyesuaikan Harga Akhir Order Jamaah.
11. Struktur Klaster "Gold" pada master paket tetap utuh, namun relasi Order Jamaah tersebut mencatat hotel *override*-nya secara eksklusif.

## Tahap 4: Manifesting & Execution (Roadmap)
12. Saat Tim Operasional menarik Manifest Jamaah per Hotel, sistem akan membaca Hotel dari tabel `Order Jamaah` (jika ada *override*), atau *fallback* membaca Hotel dari tabel `Paket Klaster` (jika jamaah memakai default klaster).
