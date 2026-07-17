# Dependency Mapping

## 1. Inbound Dependencies
Modul atau sistem yang **wajib beroperasi terlebih dahulu** agar "Generate Paket" berfungsi:
- **Master Data / Configuration Center**: Termasuk Master Jenis Paket, Starting Point, Durasi, Maskapai, Pola Landing, Kategori Perlengkapan, Klaster, dan Hotel. Tanpa opsi ini, Admin tidak bisa me-meramu paket.
- **Date Calculation Service**: Helper/Service *utility* yang mampu menjumlahkan durasi hari ke tanggal keberangkatan secara akurat (memperhitungkan *leap year*, jumlah hari per bulan).

## 2. Outbound Dependencies
Modul atau sistem yang **secara absolut bergantung** pada hasil "Generate Paket":
- **Order Management System (Modul Order Jamaah)**: Pembuatan reservasi jamaah tidak akan bisa dilakukan tanpa adanya produk akhir dari Generate Paket. Logika penentuan harga tagihan (Invoice) jamaah bergantung 100% pada pemetaan Klaster dan Harga di tabel paket ini.
- **Inventory & Seat Management (Roadmap)**: Sistem *full seat* akan membaca jumlah slot (kuota kursi penerbangan) yang dialokasikan (atau *attached*) ke setiap Paket Keberangkatan.
- **Materialisasi & Logistik (Roadmap)**: Logistik koper akan membaca ID `Kategori Perlengkapan` pada setiap paket keberangkatan untuk dipersiapkan bagi jamaah yang terdaftar di order modul.
- **Hotel Manifest Reporting**: Pembagian kamar (Rooming List) jamaah akan bersumber dari resolusi Hotel (Default Klaster vs Override Order).
