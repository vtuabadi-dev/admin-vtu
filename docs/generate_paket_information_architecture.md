# Information Architecture & Entity Relationship

## 1. Entity: Paket Keberangkatan (paket_umroh)
Menyimpan entitas fisik paket yang sudah di-generate per tanggal.
- `id` (PK, UUID)
- `kode_paket` (String, Unique, Generated)
- `tanggal_keberangkatan` (Date)
- `tanggal_kedatangan` (Date)
- `master_jenis_paket_id` (FK)
- `master_starting_point_id` (FK)
- `master_durasi_id` (FK)
- `master_maskapai_id` (FK)
- `master_pola_landing_id` (FK)
- `master_kategori_perlengkapan_id` (FK)
- `is_multi_klaster` (Boolean)
- *Future Extensions (Nullable)*: `flight_detail_id`, `seat_capacity`, `materialization_status`.

## 2. Entity: Paket Harga & Klaster (paket_umroh_klaster)
Entitas ini sangat krusial untuk memenuhi Business Rule "Hotel di-define saat Generate Paket, spesifik per Klaster".
- `id` (PK, UUID)
- `paket_umroh_id` (FK)
- `master_klaster_id` (FK, Nullable jika is_multi_klaster = false)
- `harga` (Decimal/Numeric)
- `master_hotel_makkah_id` (FK)
- `master_hotel_madinah_id` (FK)

## 3. Entity: Order Jamaah (order_jamaah) & Order Detail
Menyimpan transaksi order. Disinilah *Override Hotel* terjadi.
- `id` (PK, UUID)
- `paket_umroh_klaster_id` (FK - mengikat pada harga dan klaster spesifik)
- `override_hotel_makkah_id` (FK, Nullable) - Jika jamaah upgrade hotel Makkah
- `override_hotel_madinah_id` (FK, Nullable) - Jika jamaah upgrade hotel Madinah
- `harga_akhir` (Decimal) - Harga setelah penyesuaian upgrade.

## 4. Future Extensibility Architecture
Rancangan *Paket Keberangkatan* bersifat *Agile*. Untuk modul masa depan:
- **Detail Flight**: Akan dibuatkan tabel *Routing Penerbangan* terpisah (Transit, Layover, PNR) yang me-reference ke `paket_umroh`.
- **Full Seat**: Akan menambahkan tabel `paket_umroh_inventory` untuk melacak kuota *booked*, *available*, dan *hold*.
- **Full Materialisasi**: Status pengadaan koper dan perlengkapan jamaah akan dihubungkan lewat `master_kategori_perlengkapan_id` menuju manifest jamaah secara dinamis.
