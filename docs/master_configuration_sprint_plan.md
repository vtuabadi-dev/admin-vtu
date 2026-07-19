# Master Configuration Sprint Plan
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## SPRINT 1 - Master Foundation
- **Sprint Goal:** Membangun infrastruktur fundamental CRUD dan mengaktifkan 3 Master Basis (Jenis Paket, Durasi, Starting Point) yang bebas bug.
- **Deliverables:** API & UI untuk 3 entitas tersebut. Boilerplate Pagination, Validation, dan Activity Logger dasar.
- **Dependency:** Infrastructure Server / DB sudah berjalan.
- **Risk:** Standarisasi desain UI belum final. (Mitigasi: Pakai komponen UI generik terlebih dahulu).
- **Definition of Done (DoD):** Kode lulus Unit Test (>80%), Fitur di-deploy ke environment Staging, tidak ada P1/P2 Bugs, Activity Event log tercatat di terminal/tabel log.

## SPRINT 2 - Master Property
- **Sprint Goal:** Merilis entitas relasional (Hotel, Klaster, Maskapai, Landing Pattern).
- **Deliverables:** API & UI entitas kompleks.
- **Dependency:** SPRINT 1 Selesai.
- **Risk:** Kesalahan relasi Foreign Key yang dapat menyulitkan perubahan struktur ke depan.
- **DoD:** Pengetesan E2E Form bertingkat (Cascading) sukses.

## SPRINT 3 - Generate Paket (The Aggregator)
- **Sprint Goal:** Mewujudkan arsitektur *Generate Paket* sebagai Configuration Master.
- **Deliverables:** Form Raksasa Pembuatan Paket Umroh & Engine *Effective Date Pricing*.
- **Dependency:** SPRINT 1 & 2 Selesai Mutlak.
- **Risk:** Kompleksitas bisnis yang menyebabkan UI lambat (lag) atau *Over-fetching* API. (Mitigasi: Optimize Payload, Index Database).
- **Blocked By:** Finalisasi skema Harga dari Finance (Jika ada).
