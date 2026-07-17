# Implementation Readiness Checklist
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Engineering Gate (Checklist)
Sebelum kode mulai ditulis (Sprint Planning), *Tech Lead / Architect* wajib memverifikasi setiap entitas melalui *Checklist* ini.

### 1.1 Checklist: Modul Master Data (Basic: Jenis Paket, Durasi, Starting Point)
- [ ] **Business Rule Complete:** (Apakah panjang hari minimal/maksimal sudah jelas?).
- [ ] **UX Complete:** (Desain form input & tabel master sudah disetujui *Product Owner*).
- [ ] **Validation Complete:** (Skema validasi unik, alphanumeric terdefinisi di Zod/Joi).
- [ ] **Activity Event Defined:** (Payload JSON untuk dikirim ke EAC sudah disepakati).
- [ ] **Permission Defined:** (RBAC: `create:master_data`, `edit:master_data`).
- [ ] **API Design Ready:** (Endpoint `/api/v1/masters/duration` dll. didokumentasikan di Swagger).
- [ ] **Database Design Ready:** (Prisma Schema untuk tabel siap ditinjau, mendukung `is_active` dan `is_deleted`).
- [ ] **Testing Scenario Ready:** (Unit Test & E2E list tersedia).

### 1.2 Checklist: Modul Aggregator (Generate Paket)
- [ ] **Dependency Ready:** Seluruh API Master Data di atas sudah *Deployed* (Setidaknya di Staging/Mock).
- [ ] **Snapshot Mechanism Defined:** Skema JSONB/Tabel pemisahan Order vs Master sudah diaudit secara arsitektural.
- [ ] **Effective Date Workflow:** Logika cron-job/middleware untuk *Date-based Active Price* sudah terencana.
- [ ] **EAC Traceability Ready:** Persiapan payload untuk mencatat *Correlation ID* dari konfigurasi paket hingga rilis.

## 2. GO / NO-GO Decision
Jika ada kotak [ ] yang belum terpenuhi pada fitur yang akan masuk Sprint, fitur tersebut berstatus **NO-GO** (Ditendang kembali ke fase Grooming/Discovery) demi mencegah utang teknis (*Technical Debt*).
