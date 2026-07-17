# Master Data Implementation Map
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Overview
Dokumen ini memetakan seluruh entitas Master Data fundamental yang wajib diimplementasikan sebelum menyentuh logika *Generate Paket Umroh*. Master Data adalah *Single Source of Truth* dan tidak bergantung pada *Generate Paket*.

## 2. Master Data Entities

### 2.1 Master Jenis Paket (Package Types)
- **Business Purpose:** Klasifikasi produk (Reguler, Plus, VIP).
- **Business Owner:** Product Manager / Sales Manager.
- **CRUD Policy:** Create (Admin), Read (All), Update (Admin), Delete (NO, Inactive Only).
- **Referential Integrity:** Dipakai oleh Generate Paket. Jika inactive, paket yang sudah memakai tidak rusak.
- **Validasi:** Nama Unik, Deskripsi Wajib.
- **Status Lifecycle:** Draft → Active → Inactive.

### 2.2 Master Starting Point (Keberangkatan)
- **Business Purpose:** Menentukan kota asal/bandara asal jamaah (Misal: CGK Jakarta, SUB Surabaya).
- **Business Owner:** Operation Manager.
- **CRUD Policy:** Create (Ops), Read (All), Update (Ops), Delete (NO).
- **Dependency:** Mempengaruhi perhitungan biaya domestik tambahan (Add-on).

### 2.3 Master Lama Perjalanan (Duration)
- **Business Purpose:** Mengatur total durasi hari (Misal: 9 Hari, 12 Hari, 16 Hari).
- **Business Owner:** Product Manager.
- **Referential Integrity:** Menentukan kalkulasi hari *Makkah* vs *Madinah*.
- **Validasi:** Minimal 9 Hari (Regulasi normal).

### 2.4 Master Landing Pattern
- **Business Purpose:** Alur penerbangan (JED-MED, MED-JED, JED-JED).
- **Business Owner:** Flight & Operation Manager.
- **Dependency:** Sangat krusial menentukan jadwal Bus dan urutan pemesanan Hotel.

### 2.5 Master Maskapai (Airline)
- **Business Purpose:** Data maskapai penerbangan (Saudia, Garuda, Emirates).
- **Business Owner:** Flight Manager.
- **CRUD Policy:** Ops & Admin. 
- **Future Expansion:** Kolom Logo maskapai, Rating, IATA Code.

### 2.6 Master Hotel
- **Business Purpose:** Entitas properti hotel (Swissotel, Pullman).
- **Business Owner:** Rooming / Hotel Manager.
- **Validasi:** Kota (Makkah/Madinah), Rating Bintang, Jarak ke Haram.
- **Dependency:** Klaster Hotel.

### 2.7 Master Klaster
- **Business Purpose:** Pengelompokkan kelas fasilitas (Bintang 3, Bintang 4, Bintang 5).
- **Dependency:** Hotel berelasi dengan Klaster. Paket memilih Klaster.

### 2.8 Master Perlengkapan (Equipments)
- **Business Purpose:** Inventaris barang jamaah (Koper, Seragam, Buku Doa).
- **Business Owner:** Inventory Manager.
- **Validasi:** Stok wajib, Harga Pokok.
- **Future Expansion:** Integrasi modul *Warehouse/Materialisasi*.
