# Enterprise Engineering Handbook

## Getting Started
Selamat datang di repositori Enterprise Engineering Handbook perusahaan. Kumpulan dokumen ini bertindak sebagai Single Source of Truth (SSOT) untuk seluruh standar teknis, arsitektur, metodologi, dan kebijakan (Governance) di lingkungan Engineering.

Bagi seluruh anggota tim, pemahaman mendalam terhadap handbook ini sangat krusial guna menjaga skalabilitas, konsistensi kode, serta jaminan mutu (Quality Assurance) yang enterprise-grade.

## Document Structure
Dokumentasi ini dibagi menjadi beberapa klaster fungsional (Core Governance, Standards, Deployment, Database, Security, Operations) yang terhubung ke satu titik pusat (Master Entry Point).

## Master Documents
Berikut adalah daftar seluruh pilar utama tata kelola yang wajib diikuti:
- **[Engineering Playbook](engineering_playbook.md)** (Master Governance & Index)
- **[Database Governance](database_governance.md)** (Schema, Migration, Drift)
- **[Build Hygiene](build_hygiene_policy.md)** (CI/CD Pipeline, Compilation Rules)
- **[Deployment](deployment_environment_guide.md)** (Environment, Next.js Standalone, Node.js)
- **[Security](security_governance.md)** (Secret Management, IAM, Posture)
- **[Testing](testing_governance.md)** (Piramida Unit, E2E, Regression, UAT)
- **[Performance](performance_governance.md)** (Optimasi Query, Cache, Budget)
- **[Observability](observability_governance.md)** (Log Terpusat, Tracing, Alerts)
- **[Release](release_governance.md)** (SemVer, Hotfix, Release Candidate)
- **[ADR (Architecture Decision Record)](architecture_decision_record.md)** (Rekam Jejak Keputusan)
- **[Incident Recovery](incident_recovery_flow.md)** (SLA, Penanganan Bencana)
- **[Engineering Recommendation](engineering_recommendation.md)** (Prioritas Penanganan Isu)

## Governance Version
- **Current Version**: v2.2
- **Status**: **READY FOR LOCK**
- **Owner**: Tech Lead / Chief Technology Officer
- **Review Cycle**: Quarterly (Setiap 3 Bulan)

## New Engineer Onboarding
Bagi engineer baru, Anda **WAJIB** membaca dokumen-dokumen berikut secara berurutan sebelum Anda diizinkan membuat *Pull Request* pertama Anda:
1. `governance_glossary.md` (Pahami Terminologi)
2. `company_engineering_standard.md` (Pahami Pilar Wajib)
3. `engineering_playbook.md` (Pahami Prinsip Clean Architecture)
4. `coding_standards.md` (Pahami Gaya Penulisan Kode)
5. `architecture_decision_record.md` (Pahami Proses Pengambilan Keputusan)
6. `database_governance.md` (Pahami Aturan Migrasi & Anti-Drift)
