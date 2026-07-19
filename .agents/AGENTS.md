# EEOS GOVERNANCE BASELINE v1.2
Status: FROZEN

# EEOS (Engineering Execution Orchestration System)
## Addendum: Engineering Evidence Standard (EES)

# Engineering Evidence Standard (EES)

==========================================================
1. Evidence Classification
==========================================================

Seluruh Engineering Report WAJIB mengklasifikasikan setiap Root Cause menjadi salah satu kategori berikut.

A. CONFIRMED
Hanya boleh digunakan apabila didukung oleh bukti langsung.
Contoh Evidence:
- Build Logs
- Runtime Logs
- Stack Trace
- Source Code Inspection
- Database Query Result
- Prisma Query
- API Response
- Network Inspection
- Browser Console
- Environment Variable Inspection
- Server Logs
- Official Documentation
- Deployment Logs

Tanpa bukti langsung, status CONFIRMED tidak boleh digunakan.

B. HIGH CONFIDENCE
Digunakan apabila terdapat beberapa evidence tidak langsung yang saling menguatkan tetapi belum ada pembuktian eksplisit.
Contoh:
- dependency tracing
- execution flow
- behavioural analysis
- static code analysis
Namun belum ada log atau evidence langsung.

C. HYPOTHESIS
Digunakan apabila penyebab masih berupa dugaan yang memerlukan validasi tambahan.

==========================================================
2. Evidence Requirement
==========================================================

Setiap Root Cause WAJIB memiliki section:
**Evidence Used**
Minimal berisi daftar evidence yang digunakan.

Contoh:
Evidence Used:
- E-001 Build Log
- E-002 Source Code
- E-003 Database Query
- E-004 Environment Inspection

Jika section ini kosong, Root Cause tidak boleh diberi label CONFIRMED.

==========================================================
3. Confidence Level
==========================================================

Seluruh Engineering Report WAJIB memiliki bagian:
**Confidence Level**
Nilainya hanya boleh salah satu:
- CONFIRMED
- HIGH CONFIDENCE
- HYPOTHESIS
Tidak boleh dikosongkan.

==========================================================
4. Forbidden Statements
==========================================================

Agent DILARANG menggunakan kalimat berikut apabila belum memiliki evidence langsung:
- ROOT CAUSE CONFIRMED
- 100% pasti
- Terbukti
- Dipastikan
- Final Root Cause
- Berhasil
- Selesai
- Completed

Apabila belum memenuhi standar CONFIRMED, gunakan bahasa yang sesuai dengan tingkat keyakinan.

==========================================================
5. Evidence Source Hierarchy
==========================================================

Urutkan kekuatan Evidence menjadi:

**Tier 1 (Strong Evidence)**
- Runtime Log
- Stack Trace
- Build Log
- Database Query
- Prisma Query
- Network HAR
- API Response
- Source Code
- Git Diff
- Git Status
- Output Terminal (ls, dir, tree, cat)
- File Inspection
- Screenshot

**Tier 2**
- Environment Inspection
- Configuration
- Official Documentation

**Tier 3**
- Static Analysis
- Dependency Analysis
- Behaviour Observation

**Tier 4**
- Assumption
- Pattern Matching
- Human Memory
- Engineering Intuition

Semakin rendah Tier Evidence, semakin rendah pula Confidence Level yang diperbolehkan.

==========================================================
6. Confidence Mapping
==========================================================

- **Tier 1** boleh menghasilkan **CONFIRMED**
- **Tier 2 + Tier 3** maksimal **HIGH CONFIDENCE**
- **Tier 4** hanya boleh **HYPOTHESIS**

==========================================================
7. Decision Gate & Decision Matrix
==========================================================

| Confidence | Audit | Coding | Refactor | Commit | Deploy |
|------------|-------|---------|-----------|---------|---------|
| CONFIRMED | ✅ | ✅ | ✅ | ✅ | ✅ |
| HIGH CONFIDENCE | ✅ | PO Approval | ❌ | ❌ | ❌ |
| HYPOTHESIS | ✅ | ❌ | ❌ | ❌ | ❌ |

Deployment memiliki risiko lebih tinggi dibanding Commit sehingga harus dipisahkan.

Sebelum memberikan rekomendasi implementasi, Agent WAJIB melakukan validasi berdasarkan matriks di atas.
IF Confidence == CONFIRMED → boleh memberikan rekomendasi implementasi.
IF Confidence == HIGH CONFIDENCE → wajib meminta validasi tambahan ATAU meminta Approval Product Owner sebelum implementasi.
IF Confidence == HYPOTHESIS → DILARANG memberikan rekomendasi implementasi.

==========================================================
8. Engineering Review Standard
==========================================================

Pada bagian akhir Engineering Review WAJIB terdapat section berikut.

**Evidence Summary**
Berisi:
- Evidence Collected
- Evidence Tier
- Confidence Level
- Implementation Recommendation

Recommendation hanya boleh:
- Proceed Documentation
- Proceed Investigation
- Proceed Coding
- Proceed Refactoring
- Proceed Database Migration
- Proceed Deployment
- Blocked
- Waiting Product Owner Approval
- Waiting Additional Evidence

==========================================================
9. Mandatory Compliance & Self Consistency Check
==========================================================

Mulai saat EEOS diperbarui, Engineering Evidence Standard menjadi Mandatory.
Seluruh sprint berikutnya WAJIB mengikuti standar ini.
Lakukan audit terhadap implementasi EES menggunakan EES itu sendiri. Pastikan tidak ada kontradiksi.
Pastikan seluruh laporan telah memenuhi:
- Evidence Used
- Evidence Tier
- Confidence Level
- Decision Gate
- Evidence Summary

Tidak boleh ada Engineering Report yang tidak memiliki elemen-elemen di atas.

==========================================================
10. Evidence Lifecycle
==========================================================

Evidence Collection
↓
Evidence Validation
↓
Evidence Classification
↓
Decision Making
↓
Evidence Archive
↓
Future Audit Reference

Tujuan setiap tahap:
- Evidence Collection: Mengumpulkan data mentah dari berbagai sumber terkait (log, database, dll).
- Evidence Validation: Memastikan data valid dan relevan dengan konteks permasalahan.
- Evidence Classification: Menentukan Tier dan Confidence dari bukti yang telah tervalidasi.
- Decision Making: Menggunakan bukti terklasifikasi untuk mengambil keputusan engineering (coding, deploy, dll).
- Evidence Archive: Menyimpan bukti ke dalam riwayat dokumentasi sehingga tidak hilang.
- Future Audit Reference: Memastikan seluruh Evidence yang digunakan pada Engineering Report tetap dapat ditelusuri pada audit berikutnya.

==========================================================
11. Evidence ID
==========================================================

Setiap bukti WAJIB memiliki identifier unik.

Contoh:
E-001
Runtime Log

E-002
Terminal Output

E-003
Database Query

E-004
Network Trace

E-005
Build Log

Engineering Report cukup mereferensikan identifier-nya:

Evidence Used
- E-001
- E-003
- E-004

Tidak perlu mengulang isi bukti secara penuh di seluruh dokumen. Penomoran bersifat sekuensial (E-001, E-002, dst) per konteks penyelesaian masalah atau dokumentasi agar mudah ditelusuri.

==========================================================
12. ADR Trigger Policy
==========================================================

EEOS menentukan kapan Architecture Decision Record (ADR) WAJIB dibuat.

Minimal kondisi berikut:
- Database Schema berubah
- Business Rule berubah
- Authentication berubah
- Authorization berubah
- Security berubah
- Infrastructure berubah
- Public API berubah
- Breaking UI
- Breaking Contract
- Cross Domain Impact

Jika salah satu kondisi terpenuhi maka:

STOP IMPLEMENTATION

Status:
ADR REQUIRED

Coding baru boleh dilakukan setelah ADR disetujui Product Owner.

==========================================================
13. EEOS Version Governance
==========================================================

EEOS memiliki governance terhadap dirinya sendiri.

Flow:
Proposal
↓
Architecture Review
↓
Engineering Review
↓
Product Owner Approval
↓
Version Increment
↓
Official Release

Aturan:
Tidak ada engineer yang boleh mengubah EEOS secara sepihak.
Perubahan EEOS harus melalui proses governance yang sama seperti perubahan arsitektur.

==========================================================
14. Governance Status
==========================================================

Version:
EEOS Governance Baseline v1.2

Status:
FROZEN

Effective Date:
13 July 2026

Approved By:
Product Owner

Scope:
VTU ABADI Engineering Governance

Applies To:
- Architecture
- Database
- Backend
- Frontend
- DevOps
- QA
- Investigation
- Audit
- Documentation
- Deployment

==========================================================
15. Governance Freeze Statement
==========================================================

Mulai versi ini seluruh engineer, AI Agent, reviewer, maupun contributor wajib menjadikan EEOS sebagai Source of Truth engineering.

Perubahan terhadap EEOS tidak diperbolehkan secara langsung.

Setiap perubahan wajib melalui:
Proposal
↓
Architecture Review
↓
Engineering Review
↓
Product Owner Approval
↓
Version Increment
↓
Official Release

==========================================================
16. Baseline Scope
==========================================================

EEOS berlaku untuk:
- Investigation
- Root Cause Analysis
- Architecture
- ADR
- Coding
- Refactoring
- Database Migration
- Testing
- QA
- Deployment
- Engineering Review
- Documentation

==========================================================
17. Future Governance
==========================================================

Semua revisi EEOS setelah versi ini wajib dianggap sebagai Governance Evolution.

Tidak boleh ada perubahan minor yang langsung mengubah baseline tanpa proses governance resmi.
