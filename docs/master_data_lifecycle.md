# Master Data Lifecycle
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. The State Machine
Siklus hidup setiap Master Data diatur dalam *State Machine* baku:
`DRAFT` → `ACTIVE` ↔ `INACTIVE` → `ARCHIVED` (Opsional/Masa Depan)

## 2. State Definition & Rules

### DRAFT
- **Kondisi:** Data baru dibuat tetapi belum lengkap atau masih menunggu persetujuan (Opsional).
- **Siapa:** Admin / Data Entry.
- **Dampak:** Data tidak muncul di *dropdown* menu pembuatan *Generate Paket*. Tidak bisa digunakan operasional.

### ACTIVE
- **Kondisi:** Data terverifikasi valid, lengkap, dan siap rilis.
- **Siapa:** Manager / Supervisor (Approval) atau Admin.
- **Dampak:** Muncul secara global. Modul Generate Paket dapat menarik data ini untuk disatukan dalam Konfigurasi Paket.

### INACTIVE
- **Kondisi:** Data tidak relevan lagi (Misal: Maskapai bangkrut, tipe paket dihilangkan, kontrak hotel habis).
- **Siapa:** Operation Manager.
- **Dampak Mutlak:** 
  1. Data menghilang dari *dropdown* rilis paket BARU.
  2. Paket LAMA yang sudah terlanjur menggunakan data ini TETAP BERFUNGSI dan relasinya tidak rusak. Ini adalah inti perlindungan sistem ERP.
  3. Mencatat log di EAC.

### DELETED (Exception Only)
- **Kondisi:** Soft delete (`is_deleted = true`).
- **Siapa:** System Admin.
- **Dampak:** Hanya dapat dilakukan JIKA entitas belum digunakan *(0 references)*. Jika sudah direferensikan, tombol Delete didisable dan disarankan memakai fungsi INACTIVE.
