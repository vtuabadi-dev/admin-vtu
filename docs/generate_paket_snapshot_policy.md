# Generate Paket - Snapshot Policy
**Status:** DISCOVERY & BUSINESS RULE ONLY
**Target System:** VTU ABADI - ERP Core
**Architecture:** Clean Architecture, Framework Agnostic

## 1. Overview
Dokumen ini mendefinisikan kebijakan pembekuan data (Snapshot) pada saat terjadinya transaksi (Order) oleh Jamaah. Mengingat Harga Paket bersifat dinamis (diatur dalam *Price Policy*), sistem membutuhkan mekanisme proteksi agar transaksi masa lalu tidak terdampak oleh perubahan konfigurasi master.

## 2. Core Principle
> **"Generate Paket adalah Configuration. Order Jamaah adalah Snapshot."**

Setiap order atau transaksi yang masuk WAJIB menggunakan data yang tidak dapat diubah (Immutable Data / Snapshot) dari master konfigurasi pada saat order tersebut disepakati.

## 3. Business Rules

### Rule 3.1 - Mandatory Snapshot Creation
Ketika Jamaah / Agen melakukan aksi Order/Pemesanan, sistem **WAJIB** membuat **Snapshot Harga** (dan komponen paket) untuk order tersebut. 

### Rule 3.2 - Immutability of Transaction
Harga yang tersimpan dalam Snapshot Order bersifat permanen dan mengikat untuk Order spesifik tersebut. Apabila Admin di kemudian hari melakukan pembaruan harga pada entitas "Generate Paket" (mengubah Harga Aktif), **Order lama TIDAK BOLEH berubah** nilainya.

### Rule 3.3 - Extensibility (Future Component Snapshots)
Kebijakan Snapshot ini merupakan fondasi arsitektur. Di masa depan, kebijakan yang sama WAJIB diaplikasikan secara konsisten untuk komponen konfigurasi lainnya yang meliputi (namun tidak terbatas pada):
- Hotel (Tipe kamar, durasi menginap)
- Flight (Maskapai, rute, kelas penerbangan)
- Perlengkapan (Jenis koper, seragam)
- Seat (Alokasi kuota kursi)
- Materialisasi (Distribusi fisik komponen)

## 4. Rationale
Tanpa adanya arsitektur Snapshot, setiap update pada Harga Master akan menyebabkan efek domino (ripple effect) yang merusak integritas data historis keuangan (Accounting), piutang Jamaah, dan laporan laba-rugi operasional. Snapshot menggaransi *Financial Compliance* dalam sistem ERP.
