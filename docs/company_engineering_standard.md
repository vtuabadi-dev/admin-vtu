# Company Engineering Standard

Dokumen ini mendefinisikan pilar standar minimum yang wajib diadopsi oleh *seluruh proyek* (Project) perusahaan. Hal ini untuk memastikan skalabilitas, kualitas, dan keamanan (*Enterprise Grade*) seragam di setiap *codebase*.

## Document Classification

Dokumen tata kelola (*Governance Documents*) diklasifikasikan ke dalam 3 tingkat kepentingan:
- **MANDATORY**: Pilar absolut perusahaan. Kegagalan mematuhi dokumen ini berarti menentang arsitektur inti (*Core Architecture*) dan pelanggaran serius atas prosedur perusahaan.
- **RECOMMENDED**: Pilar teknis spesifik yang sebaiknya diikuti untuk menjaga performa optimal, kecuali ada halangan teknologi tertentu.
- **OPTIONAL**: Pilar prosedural pelengkap yang diadopsi sesuai skala atau kompleksitas masing-masing proyek/sprint.

## Mandatory Documents

Seluruh proyek perusahaan (baik sistem *legacy* yang akan direfaktor, maupun aplikasi baru) **WAJIB** menerapkan regulasi yang tertera di dokumen berikut:

1. **[Engineering Playbook](engineering_playbook.md)** (Pedoman Pusat)
2. **[Architecture Decision Record (ADR)](architecture_decision_record.md)** (Rekam Jejak Historis Mutasi Sistem)
3. **[Security Governance](security_governance.md)** (Standar Keamanan dan *Credential Rotation*)
4. **[Database Governance](database_governance.md)** (Prosedur Skema, Relasi, dan Migrasi)
5. **[Build Hygiene Policy](build_hygiene_policy.md)** (Pipeline CI/CD Agnostik)
6. **[Release Governance](release_governance.md)** (Standarisasi Peluncuran, SemVer, Hotfix)
7. **[Deployment Environment](deployment_environment_guide.md)** (Keseragaman Konfigurasi Lintas Lingkungan)

## Recommended Documents

Pilar berikut direkomendasikan secara kuat guna mencapai tingkat kualitas tertinggi dan kemudahan perawatan (*maintainability*):

1. **[Coding Standards](coding_standards.md)** (Konvensi Layering, TypeScript, Anti-patterns)
2. **[Testing Governance](testing_governance.md)** (Target Coverage 80% dan Testing Pyramid)
3. **[Performance Governance](performance_governance.md)** (Anggaran dan Efisiensi Kueri N+1)
4. **[Observability Governance](observability_governance.md)** (Telemetri, Logging Terpusat, Tracing)

## Optional Documents

Dokumen di bawah adalah modul operasional yang bersifat instruksional bagi kasus tertentu:

1. **[Incident Recovery Flow](incident_recovery_flow.md)** (Alur mitigasi ketika insiden Configuration Error terjadi)
2. **[Engineering Recommendation (Build Gate)](engineering_recommendation.md)** (Urutan investigasi *troubleshooting* dari hulu ke hilir)
3. **[Engineering Lessons Learned (in Playbook)](engineering_playbook.md#12-engineering-lessons-learned)** (Kajian Kasus atas Insiden *Post Mortem*)
