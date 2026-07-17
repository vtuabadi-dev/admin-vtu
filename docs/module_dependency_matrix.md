# Module Dependency Matrix
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Overview
Matriks ini mendefinisikan kepemilikan dan penggunaan data lintas domain, mencegah duplikasi kode atau skema (*Single Source of Truth*).

## 2. Dependency Matrix

| Modul Pengguna (Consumer) | Mengonsumsi Master Data (Dependencies) | Sifat Konsumsi |
| :--- | :--- | :--- |
| **Generate Paket** | ✓ Jenis Paket<br>✓ Starting Point<br>✓ Durasi<br>✓ Landing Pattern<br>✓ Maskapai<br>✓ Hotel & Klaster<br>✓ Perlengkapan | **Relational (FK)** (Merujuk pada master aktif) |
| **Order Jamaah** | ✓ Snapshot Harga<br>✓ Snapshot Hotel<br>✓ Snapshot Perlengkapan | **Immutable (Snapshot)** (Di-copy statis, menolak update dari asal) |
| **Manifest (Penerbangan)** | ✓ Maskapai<br>✓ Landing Pattern<br>✓ Rute Keberangkatan | **Relational** (Dibutuhkan untuk print manifest maskapai & bus) |
| **Rooming (Kamar)** | ✓ Hotel<br>✓ Snapshot Klaster | **Relational + Snapshot** (Pembagian nama kamar sesuai kapasitas kasur di Master Hotel) |
| **Materialisasi** | ✓ Perlengkapan | **Relational** (Untuk pelacakan stok keluar/masuk gudang) |
| **Enterprise Activity Center** | Seluruh Aktivitas Modul di atas | **Event-Driven (Async)** (Mencatat semua perubahan master data secara *Read-Only*) |

## 3. Engineering Enforcement
- Modul *Order Jamaah* dilarang me-`JOIN` tabel `Master_Harga` saat melakukan tagihan/invoice. Wajib me-`JOIN` tabel `Order_Snapshot_Harga`.
- Modul *Rooming* memanggil Service `GetHotelLayout()` milik Domain Hotel, bukan membongkar database Hotel langsung. (Penerapan *Domain-Driven Design*).
