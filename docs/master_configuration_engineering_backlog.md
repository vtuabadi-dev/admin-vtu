# Master Configuration Engineering Backlog
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## Epic: Foundation Master Data
**Feature: Simple Master CRUD**
- Task: Prisma Schema Setup untuk (Jenis, Durasi, Starting Point) [Est: Low]
- Task: REST API CRUD Controller & Service [Est: Medium]
- Task: Zod/Joi Validation Middleware [Est: Low]
- Task: UI Tabel Data dengan Pagination [Est: Medium]
- Task: UI Form Modal Create/Edit [Est: Medium]

**Feature: Complex Master CRUD (Hotel & Klaster)**
- Task: Prisma Schema untuk Hotel & Klaster dengan Relasi 1:M [Est: Medium]
- Task: REST API terintegrasi [Est: Medium]
- Task: Cascading Dropdown UX di Form Klaster [Est: High]

## Epic: Activity Integration (Phase 1)
**Feature: EAC Logger Plugin**
- Task: Pembuatan interceptor / decorator untuk otomasi event log setiap transaksi database [Est: High]
- Task: Integrasi Payload "Action, Old Value, New Value" ke Message Queue / Async Job [Est: High]

## Epic: Generate Paket & Snapshot
**Feature: Package Configuration Engine**
- Task: Schema Database Aggregator [Est: High]
- Task: Complex UI Form (Multi-step wizard) [Est: XL]
- Task: Effective Date Logic Middleware (Pricing) [Est: High]

**Feature: Order Snapshot Mechanism**
- Task: Transactional Service (Hard-copy data dari master ke tabel Transaksi) [Est: High]
- Subtask: Unit test memastikan imutabilitas data order saat master diubah [Est: Medium]
