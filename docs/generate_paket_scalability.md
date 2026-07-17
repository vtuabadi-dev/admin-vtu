# Future Scalability & Roadmap

Arsitektur Generate Paket didesain *agile* agar integrasi operasional spesifik dapat "dicangkokkan" tanpa harus memecah entitas utama.

## 1. Detail Flight Management
- **Rencana**: Paket Umroh saat ini baru mengikat Master Maskapai (contoh: Saudia). Di masa depan, akan dibutuhkan PNR (Booking Code), rute spesifik (CGK-JED), dan jam keberangkatan/kedatangan aktual.
- **Arsitektur**: Akan dibuatkan Entitas `flight_schedules` yang memiliki agregasi 1-to-M terhadap entitas `paket_umroh`. Input PNR dapat dilakukan pasca-Generate Paket.

## 2. Full Materialisasi
- **Rencana**: Kategori Perlengkapan (misal: VIP) yang diset pada saat generate paket, akan dijabarkan menjadi item detail (Koper 24", Koper 20", Ihram, Mukena).
- **Arsitektur**: Entitas `paket_umroh` tidak perlu diubah. *Engine Materialisasi* akan membaca relasi `paket_umroh.master_kategori_perlengkapan_id` -> merelasikannya dengan tabel *Master Inventory BOM (Bill of Materials)* untuk mencetak *Checklist Distribusi Perlengkapan* di Gudang.

## 3. Full Seat & Inventory Capacity
- **Rencana**: Membatasi pendaftaran jamaah agar tidak *overselling*.
- **Arsitektur**: Penambahan field `total_seat` dan `available_seat` pada tabel `paket_umroh_klaster` atau di entitas terpisah `paket_umroh_inventory`. Saat Order Jamaah berstatus *Paid*, akan melakukan decrement (pengurangan) pada kolom `available_seat` (menggunakan row-level lock/DB Transaction).

## 4. Hotel Contract & Pricing Extension
- **Rencana**: Saat ini input harga dan hotel langsung manual per klaster. Ke depan bisa ditarik dari *Master Kontrak Hotel Vendor* untuk menghitung COGS (Harga Pokok Penjualan) secara otomatis.
