# Risk Assessment

## 1. Bulk Generation Performance Risk
- **Risiko**: Admin memasukkan 50 tanggal keberangkatan sekaligus beserta 4 level Klaster. Saat menekan tombol Generate, sistem harus mengeksekusi 50 transaksi *insert* ke tabel Paket, dan 200 transaksi *insert* ke tabel Paket Klaster. Ini berpotensi *timeout* atau *race condition*.
- **Mitigasi**: Implementasi *Database Transaction* (Commit/Rollback) di level backend. Eksekusi penyimpanan dilakukan secara *Batch Insert* (bulk insert) untuk menghindari saturasi koneksi *database*. UI diberikan *loading state* (spinner) yang melarang *double submit*.

## 2. Auto-Calculation Date Misalignment Risk
- **Risiko**: Rumus `Tanggal Datang = Tanggal Berangkat + Durasi - 1` bisa jadi tidak akurat jika Maskapai mengalami *layover* panjang atau perbedaan *Time Zone* lintas benua.
- **Mitigasi**: Rumus tersebut disajikan hanya sebagai **Default Value (Suggestion)** di UI Wizard. Field Tanggal Kedatangan dibuat mutlak **Editable** sehingga operasional bisa melakukan kalibrasi manual.

## 3. Order Jamaah Hotel Override Anomaly
- **Risiko**: Saat jamaah di-*upgrade* hotelnya, invoice terbit, namun saat Manifest dicetak, jamaah tersebut masih masuk ke daftar hotel lama (default klaster).
- **Mitigasi**: Di level Arsitektur *Clean Query*, seluruh modul pelaporan Manifest harus menggunakan klausa relasional yang tepat: `COALESCE(order_jamaah.override_hotel_id, paket_klaster.default_hotel_id)`. Artinya, sistem selalu memprioritaskan hotel override jika ada.

## 4. Stale Reference Data Risk
- **Risiko**: Antara saat Admin mengisi *Wizard Step 1* hingga *Step 4* (misal ditinggal istirahat), Master Hotel yang dipilih tiba-tiba di-*Nonaktifkan* oleh Super Admin lain.
- **Mitigasi**: API Create Paket harus memvalidasi ulang (mengecek `status_aktif = true`) pada semua ID referensi tepat saat momen *Generate* ditekan.
