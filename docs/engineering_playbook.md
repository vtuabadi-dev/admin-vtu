# Master Engineering Governance (Engineering Playbook)

Dokumen ini menjadi induk (Master) seluruh standar teknis dan SOP Engineering.
> **Pintu Masuk Utama**: Silakan kunjungi [Enterprise Engineering Handbook (README)](README.md) untuk struktur navigasi keseluruhan.

## 0 Versioning & Policy (Metadata)
Setiap panduan turunan dalam ekosistem Governance wajib mengacu pada metadata berikut:
- **Document Version**: v2.2
- **Status**: [Draft, Review, Approved, Locked, Deprecated] -> Saat ini: **READY FOR LOCK**
*(Selengkapnya mengenai status dokumen: lihat [Document Lifecycle Governance](governance_lifecycle.md))*
- **Document Owner**: Tech Lead / Chief Technology Officer
- **Technical Reviewer**: Architecture Team
- **Product Owner Approval**: Product Owner
- **Effective Date**: Mengikuti tanggal *Release* resmi.
- **Review Schedule**: Diulas setiap Kuartal (3 Bulan).
- **Semantic Versioning untuk Governance**: Major (Restrukturisasi total/Framework baru), Minor (Penambahan aturan baru tanpa merusak policy lama), Patch (Perbaikan typo/klarifikasi).
- **Change Log**: Dapat dilihat secara rinci pada [Governance Version History](governance_version_history.md).

## 1 Engineering Principles & Coding Standards
- Pedoman standar minimal operasional proyek: [Company Engineering Standard](company_engineering_standard.md)
- Clean Architecture, Layer Responsibility, Backward Compatibility.
- Terminologi dan Glosarium: [Engineering Glossary](governance_glossary.md)
*(Selengkapnya: lihat `coding_standards.md`)*

## 2 Architecture Decision Record (ADR)
Proses persetujuan untuk mutasi besar di sisi teknis, database, dan security.
*(Selengkapnya: lihat `architecture_decision_record.md`)*

## 3 Development Workflow & Security
- Discovery → Planning → Implementation → Verification → Review → Release
- Secret Management, Credential Rotation, & Least Privilege Principle.
*(Selengkapnya: lihat `security_governance.md`)*

## 4 Build Hygiene & Deployment Governance
Kebijakan yang mendefinisikan standar **Build Artifacts** tanpa terikat framework, mencakup:
- Pipeline build & deploy standar (Install, Generate, Migrate, Type Check, Build)
- Smoke testing requirement pasca deploy
- Troubleshooting skenario gagal deploy
*(Selengkapnya: lihat `build_hygiene_policy.md`, `deployment_environment_guide.md`, `deployment_checklist.md`, `deployment_troubleshooting.md`)*

## 5 Database, Schema Drift, & Migration Governance
Kumpulan aturan baku mengenai operasional database menggunakan Prisma.
- Kapan `schema.prisma` boleh diedit
- Additive Migration vs Destructive Migration Policy
- Cara mendeteksi dan melakukan asesmen severity dari *Schema Drift*
- Strategi pemulihan database (Missing Column, Wrong Relation, dll)
- Decision Matrix mutasi database (`db push` vs `migrate deploy`)
*(Selengkapnya: lihat `database_governance.md`)*

## 6 Testing & Observability
- Unit, Integration, E2E, Smoke, Regression, dan UAT Testing.
- Logging Standard (JSON), Metrics (Golden Signals), Tracing, dan Audit Log.
*(Selengkapnya: lihat `testing_governance.md` dan `observability_governance.md`)*

## 7 Performance Governance
- Query Optimization, N+1 Prevention, Pagination Policy, dan Bundle Size Budgeting.
*(Selengkapnya: lihat `performance_governance.md`)*

## 8 Incident Management
Standar penanganan error dan insiden, mencakup kategori F (Configuration Error) untuk isolasi masalah terkait lingkungan framework (tsconfig, next.config.js, vite.config).
*(Selengkapnya: lihat `incident_recovery_flow.md`)*

## 9 Git & Release Governance
- Branch Strategy, Atomic Commit, Release Candidate (RC), Semantic Versioning, dan Rollback Strategy.
*(Selengkapnya: lihat `release_governance.md`)*

## 10 Build Gate
Urutan validasi standar saat investigasi: Infrastructure ↓ Configuration ↓ Cache ↓ Dependency ↓ Source Code. 
*(Selengkapnya: lihat `engineering_recommendation.md`)*

## 11 Emergency Hotfix Procedure
Prosedur cepat khusus ketika environment production mengalami gangguan, diukur berdasarkan Confidence Level (EEOS v1.2).

---

## 12 Engineering Lessons Learned

Bagian ini mendokumentasikan insiden historis dan pembelajaran organisasi guna meningkatkan standar tata kelola di masa depan.

### Case Study: Production Runtime Error (Column MaskapaiId Missing)
Insiden regresi di mana aplikasi memunculkan Runtime Error di lingkungan *Preview/Production* padahal logika berjalan normal di *Local*.

- **Discovery:** Ditemukan Prisma Runtime Error `"The column keberangkatan.maskapaiId does not exist"` ketika mengakses API Keberangkatan di environment non-local.
- **Evidence:** Audit database (`production_database_schema_audit.md`) membuktikan bahwa tabel `_prisma_migrations` belum eksis dan kolom baru tidak ada di DB fisik, meskipun di source code (`schema.prisma`) kolom tersebut sudah terdefinisi.
- **Root Cause:** Script deployment CI/CD (`npm run build`) tidak menjalankan perintah sinkronisasi struktur tabel (`npx prisma migrate deploy`). Akibatnya, codebase versi terbaru dideploy tetapi struktur database tertinggal di versi lama (Schema Drift).
- **Recovery:** Dijalankan Hotfix Additive secara lokal menuju DB pooler (`prisma db push`) untuk menginkronkan struktur DB tanpa merusak data existing (Risiko Terendah).
- **Verification:** UAT komprehensif menggunakan Network Fetch test (membuktikan HTTP 200) serta UI Validation.
- **Governance Improvement:** 
  - Dibentuknya panduan standar Build Pipeline CI/CD yang *mewajibkan* tahapan Migration (`npx prisma migrate deploy`) sebelum Build.
  - Dokumentasi jelas tentang bahaya *Schema Drift* (`database_governance.md`).
  - Klarifikasi behavior injeksi `.env` pada *Next.js Standalone Build* agar developer tidak tertipu oleh false positive error auth saat testing lokal (`deployment_environment_guide.md`).
