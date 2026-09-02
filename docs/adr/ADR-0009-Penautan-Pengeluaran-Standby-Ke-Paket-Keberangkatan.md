# ADR-0009: Alur Penampungan Pengeluaran Standby dan Penautan ke Paket Keberangkatan

## Status
APPROVED

## Tanggal
2026-09-02

## Konteks
Pada operasional Travel Umroh PT Vauza Tiga Utama, transaksi pembayaran vendor (seperti *Down Payment* Hotel Makkah/Madinah, deposit tiket pesawat, atau pembayaran awal armada bus) sering kali harus dilunasi/dibayar di awal oleh perusahaan **sebelum** Paket Keberangkatan (`Keberangkatan` / `RegistrationGroup`) resmi dijadwalkan dan dibuat di sistem.

Sebelumnya, pengeluaran yang dicatat tanpa paket keberangkatan masuk ke kategori `Operasional Umum (Non-Grup)`. Namun, belum tersedia mekanisme sistematis untuk menampung transaksi tersebut sebagai **Pengeluaran Standby** dan menautkannya (*reassign*) ke Paket Keberangkatan yang baru dibuat di kemudian hari.

## Keputusan
1. **Model Penampungan Pengeluaran Standby**:
   - Pengeluaran yang dicatat tanpa memilih paket keberangkatan (`groupId = ''` / `undefined`) diklasifikasikan sebagai **Pengeluaran Standby / Belum Ditautkan**.
2. **Fitur Penautan Pengeluaran (Expense Reassignment / Linking)**:
   - Pada halaman **Buku Besar Pengeluaran (`/admin/keuangan-travel`)**, ditambahkan filter khusus `Pengeluaran Standby / Belum Ditautkan` dan tombol aksi **"Tautkan Ke Keberangkatan"** pada setiap item transaksi.
   - Admin dapat memilih 1 atau beberapa transaksi standby sekaligus dan menautkannya ke Paket Keberangkatan pilihan.
3. **Penautan dari Kartu Paket Keberangkatan**:
   - Pada daftar **Paket Keberangkatan**, disediakan tombol **"Tautkan Pengeluaran Standby"** untuk memanggil daftar transaksi standby yang tersedia dan memasukkannya langsung ke dalam kalkulasi realisasi anggaran paket tersebut.
4. **Integritas Anggaran (Budget Consolidation)**:
   - Saat transaksi ditautkan ke suatu Paket Keberangkatan, `groupId` dan `groupName` diperbarui, sehingga total realisasi pengeluaran paket keberangkatan otomatis terhitung secara akurat.

## Konsekuensi
- **Positif**:
  - Fleksibilitas pembayaran DP/vendor sebelum jadwal paket dibuat.
  - Akurasi kalkulasi laba/rugi dan materialisasi anggaran paket umroh.
  - Memudahkan audit transaksi vendor yang sempat mengendap di Operasional Umum.
