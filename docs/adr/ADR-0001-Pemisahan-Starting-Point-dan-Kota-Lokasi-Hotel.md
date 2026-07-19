# ADR-0001: Pemisahan Starting Point dan Kota Lokasi Hotel

## Status
PROPOSED

## Tanggal
2026-07-19

## Konteks
Saat ini, tabel `MasterCity` digunakan secara bersamaan untuk dua tujuan yang berbeda:
1. Sebagai **Starting Point** keberangkatan jamaah (misal: Jakarta (CGK), Surabaya (SUB), Makassar (UPG)).
2. Sebagai **Kota Lokasi Hotel** tempat jamaah menginap selama umroh (misal: Mekkah, Madinah, Jeddah).

Karena keduanya menggunakan satu tabel database yang sama (`MasterCity`), terjadi masalah berikut:
- Menambahkan lokasi baru untuk hotel (seperti Riyadh atau Jeddah) menyebabkan kota tersebut muncul secara tidak relevan di daftar *Starting Point* penerbangan.
- Mekanisme penyaringan kota lokasi hotel saat ini menggunakan `localStorage` (`hotel_city_ids`), yang tidak tersimpan di database dan tidak konsisten antar perangkat/browser pengguna.
- Proses penghapusan/deaktivasi starting poin berdampak langsung pada data hotel karena keterikatan relasi database yang sama.

Untuk itu, Product Owner meminta agar **Kota Lokasi Hotel** dipisahkan sepenuhnya dari **Starting Point** dan tidak lagi menggunakan starting point sebagai referensi relasinya.

## Opsi yang Dipertimbangkan
- **Opsi A**: Tetap menggunakan satu tabel `MasterCity` namun menambahkan kolom tipe (enum/boolean) untuk membedakan kategori (misal: `isStartingPoint` dan `isHotelCity`).
  *Trade-off*: Sederhana di sisi skema, namun relasi foreign key dari `MasterHotel` ke `MasterCity` tetap sama, sehingga tidak menyelesaikan masalah dependensi relasi database secara penuh, dan penghapusan starting point masih bisa mengganggu data hotel jika ID-nya beririsan.
- **Opsi B (Rekomendasi)**: Membuat tabel database baru bernama `MasterHotelCity` khusus untuk Kota Lokasi Hotel, dan membiarkan `MasterCity` khusus untuk Starting Point.
  *Trade-off*: Memerlukan migrasi database schema untuk membuat tabel baru dan memindahkan relasi `MasterHotel.cityId` ke tabel baru ini, namun memisahkan data secara bersih dan menyelesaikan semua masalah dependensi antar modul.

## Keputusan
Memilih **Opsi B**. Kami akan membuat model `MasterHotelCity` baru di Prisma schema dan mengarahkan relasi hotel lokasi ke tabel baru tersebut.

## Konsekuensi
- Positif: 
  * Pemisahan tanggung jawab data (Separation of Concerns) yang bersih antara operasional bandara keberangkatan (*Starting Point*) dan lokasi penginapan (*Hotel Location*).
  * Menghapus ketergantungan `localStorage` pada filter dropdown kota hotel, sehingga data tersimpan permanen di database.
  * Penghapusan Starting Point tidak akan pernah terganggu oleh referensi data Hotel.
- Negatif:
  * Memerlukan migrasi database untuk membuat tabel baru (`master_hotel_cities`) dan memperbarui kolom foreign key di tabel `master_hotels`.
  * Memerlukan migrasi data awal (seeding/migration script) untuk menyalin kota-kota hotel yang sudah ada (Mekkah, Madinah) ke tabel baru agar data hotel yang ada tidak rusak.
- Netral:
  * Mengubah endpoint API hotel dari menggunakan referensi `MasterCity` menjadi `MasterHotelCity`.
