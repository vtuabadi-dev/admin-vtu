# EEOS (Engineering Execution Orchestration System)
## Addendum: Engineering Evidence Standard (EES)
## Version: EEOS v1.1

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
- Build Log
- Source Code
- Database Query
- Environment Inspection

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
- Proceed
- Proceed with Caution
- Hold

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
