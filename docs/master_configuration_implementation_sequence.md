# Implementation Sequence
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Strategy: Bottom-Up Development
Implementasi disusun dari entitas terkecil (*No Dependency*) menuju entitas penggabung (*Aggregator*).

## 2. Sprint Roadmap

### Sprint 1: Foundation Master A
- **Deliverables:** Master Jenis Paket, Master Starting Point, Master Durasi.
- **Alasan:** Entitas paling dasar, tipe data sederhana (String, Integer). Menjadi pemanasan bagi *backend boilerplate* (CRUD, Audit Log).

### Sprint 2: Foundation Master B
- **Deliverables:** Master Landing Pattern, Master Maskapai.
- **Alasan:** Memulai entitas dengan logika bisnis sedikit lebih kompleks.

### Sprint 3: Core Property Master
- **Deliverables:** Master Hotel & Master Perlengkapan.
- **Alasan:** Membutuhkan validasi relasional mandiri (seperti Kota untuk Hotel) dan struktur JSON untuk spesifikasi kamar/perlengkapan.

### Sprint 4: Relational Master
- **Deliverables:** Master Klaster.
- **Alasan:** Klaster menggabungkan beberapa Hotel. Wajib dieksekusi setelah Hotel stabil.

### Sprint 5: Aggregator Phase (Generate Paket)
- **Deliverables:** Master Konfigurasi & Modul Generate Paket Umroh.
- **Alasan:** Semua relasi (FK) ke master data telah tersedia dan teruji. Fokus pada form raksasa dan validasi bisnis yang memadukan durasi, landing pattern, klaster, dan harga.

### Sprint 6: Immutable Transaction
- **Deliverables:** Order Snapshot Engine.
- **Alasan:** Setelah paket digenerate, modul Order harus dibangun dan memastikan Order melakukan *Hard-Copy* dari konfigurasi paket.

### Sprint 7: Command Center Bridging
- **Deliverables:** Integrasi Enterprise Activity Center secara utuh.
- **Alasan:** Sistem sudah memiliki banyak entitas untuk di-*track*. Memastikan Action (seperti *Inactive* paket) terlog sempurna ke EAC.
