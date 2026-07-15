# Master Engineering Governance (Engineering Playbook)

Dokumen ini menjadi induk seluruh SOP Engineering.

## 1 Engineering Principles
- Clean Architecture
- Layer Responsibility
- Zero Circular Dependency
- Additive Refactoring
- Backward Compatibility

## 2 Development Workflow
- Discovery
- Planning
- Implementation
- Verification
- Review
- Release

## 3 Build Hygiene
Kebijakan yang mendefinisikan standar **Build Artifacts** tanpa terikat framework.
Urutan wajib kompilasi: 
1. Install Dependencies 
2. Generate Client / Generated Code 
3. Type Check 
4. Production Build 
5. Development Run 
6. Functional Verification
*(Selengkapnya: lihat `build_hygiene_policy.md`)*

## 4 Incident Management
Standar penanganan error dan insiden, mencakup kategori F (Configuration Error) untuk isolasi masalah terkait lingkungan framework (tsconfig, next.config.js, vite.config).
*(Selengkapnya: lihat `incident_recovery_flow.md`)*

## 5 Git Governance
- Branch Strategy
- Atomic Commit
- Commit Boundary
- Release Gate

## 6 Architecture Governance
- API → Service → Repository → Database
- Forbidden Dependency
- Architecture Review

## 7 Build Gate
Urutan validasi standar saat investigasi: Infrastructure ↓ Configuration ↓ Cache ↓ Dependency ↓ Source Code. 
*(Selengkapnya: lihat `engineering_recommendation.md`)*

## 8 Release Checklist
Checklist wajib sebelum developer melakukan proses push.

## 9 Rollback Strategy
Langkah penanganan dan pemulihan ketika release gagal dilakukan.

## 10 Emergency Hotfix Procedure
Prosedur cepat khusus ketika environment production mengalami gangguan.
