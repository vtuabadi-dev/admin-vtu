# Master Configuration Contract
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. General Implementation Contract
Setiap API dan Service untuk Master Data wajib mengikuti kesepakatan (Contract) berikut:

- **Business Purpose:** *Single Source of Truth* untuk operasional dan konfigurasi.
- **Owner:** Product Manager & Operation Team.
- **Consumers:** Modul Generate Paket, Order, Manifest.
- **Reference Policy:** Modul hilir (Generate Paket) tidak boleh menyimpan relasi (FK) ke master data yang berstatus *Draft*. Hanya boleh mereferensikan status *Active*.

## 2. CRUD & Data Lifecycle Policy
- **CRUD Policy:** `GET` publik untuk internal system, `POST/PUT/PATCH` dilindungi oleh RBAC Admin.
- **Active Policy:** Master dapat diaktifkan jika telah memenuhi seluruh validasi `mandatory fields`.
- **Inactive Policy:** Master *Active* dapat diset *Inactive* (`status = 'INACTIVE'`). Ini tidak merusak relasi data paket lama (Soft validation di UI: disembunyikan dari *dropdown* pembuatan paket baru).
- **Delete Policy:** `Hard Delete` dilarang keras (NO SQL DELETE). Hanya boleh `Soft Delete` (is_deleted = true) jika dan hanya jika belum ada entitas hilir (Paket/Order) yang memakainya.

## 3. Audit Requirement & Activity Event
- Setiap perubahan (Create, Update, Inactive) wajib memancarkan **Activity Event** yang diserap oleh *Enterprise Activity Center* (EAC).
- `old_value` dan `new_value` wajib ditangkap dalam log untuk kolom yang dimutasi.

## 4. Future Readiness & Breaking Change Policy
- **Future Fields:** Schema database wajib mempertimbangkan ekstensi *JSONB* (`additional_info`) untuk menampung field tak terduga di masa depan tanpa harus `ALTER TABLE`.
- **Breaking Change Policy:** Perubahan struktur relasi (seperti merubah Cardinality 1:1 menjadi 1:M) wajib melewati fase *Architecture Decision Record (ADR)* dan tidak boleh *breaking* API *Contract* (Version 1).
