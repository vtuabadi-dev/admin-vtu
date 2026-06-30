# Architecture Version Policy

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-GOV-001 |
| **Title** | Architecture Version Policy |
| **Category** | Implementation Governance |
| **Layer** | Level 1 — Governance |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan kebijakan versioning untuk EEOS dan seluruh dokumen di dalamnya. Setiap perubahan pada EEOS harus direfleksikan dalam version number yang mengikuti aturan ini.

---

## VERSION FORMAT

```
v{MAJOR}.{MINOR}.{PATCH}
```

Example: `v3.1.0`

---

## MAJOR VERSION (X.0.0)

### Trigger
Perubahan pada salah satu dari:
- Foundation (penambahan, penghapusan, atau perubahan Foundation yang LOCKED)
- Constitution (perubahan prinsip fundamental)
- Governance (perubahan pipeline atau aturan engineering)
- Core Architecture (perubahan arsitektur fundamental)

### Examples
- `v3.0.0 → v4.0.0`: Penambahan 3 Foundation baru
- `v2.0.0 → v3.0.0`: Transisi dari Engineering System ke Knowledge Operating System

### Approval Process
1. ADR diajukan menjelaskan perubahan Foundation
2. Architecture Review oleh AI Agent
3. Product Owner Approval
4. Foundation Evolution Gate (EEOS v1.2) dijalankan
5. Seluruh dokumen terdampak diperbarui
6. Version MAJOR dinaikkan

### Review Process
- Minimal 2 Architecture Review cycle
- Impact analysis terhadap seluruh dokumen EEOS
- Dependency graph diperbarui

---

## MINOR VERSION (0.X.0)

### Trigger
Penambahan pada:
- Domain baru (Business Constitution, AI Constitution, Integration Constitution)
- Business Engine baru
- Registry baru
- Integration adapter baru
- Template baru
- ADR baru yang tidak mengubah Foundation

### Examples
- `v3.1.0 → v3.2.0`: Penambahan Invoice Constitution
- `v3.0.0 → v3.1.0`: Penambahan Environment Constitution + Domain Consolidation

### Approval Process
1. ADR atau Knowledge Curation
2. Document Authoring
3. Cross-document validation
4. Product Owner Review
5. Version MINOR dinaikkan

### Review Process
- 1 Architecture Review cycle
- Cross-document consistency check
- Dependency graph diperbarui

---

## PATCH VERSION (0.0.X)

### Trigger
Perbaikan pada:
- Dokumentasi (typo, formatting, clarity)
- Metadata (update status, version, dates)
- Contoh (menambah atau memperbaiki contoh)
- Referensi (memperbaiki broken link antar dokumen)

### Examples
- `v3.1.0 → v3.1.1`: Memperbaiki typo di Package Creation Bot Constitution
- `v3.1.1 → v3.1.2`: Update review_due date di 5 dokumen

### Approval Process
1. Identifikasi perbaikan
2. Perbaikan diterapkan langsung oleh AI Agent atau Developer
3. Version PATCH dinaikkan
4. Tidak memerlukan Product Owner Approval

### Review Process
- Self-review oleh author
- Tidak memerlukan Architecture Review formal

---

## VERSION CHANGE LOG

| Version | Date | Type | Description |
|---------|------|------|-------------|
| v1.0 | — | MAJOR | EEOS initial activation |
| v1.1 | — | MINOR | Scope Guard, Project Memory, ADR, DoD |
| v1.2 | — | MINOR | Foundation Evolution Gate, Historical Consistency |
| v3.0 | 2026-06-29 | MAJOR | Knowledge Operating System (9-Level Framework) |
| v3.1 | 2026-06-29 | MINOR | Domain Consolidation, Environment Constitution, Implementation Roadmap |
| v3.1.0 | 2026-06-29 | PATCH | Foundation Freeze — current baseline |

---

## VERSION IN DOCUMENT METADATA

Setiap dokumen EEOS membawa version number sendiri yang INDEPENDEN dari EEOS version:

```yaml
EEOS Version: v3.1.0        # EEOS framework version
Document Version: v1.2       # This document's version
```

Document version mengikuti aturan yang sama (MAJOR.MINOR.PATCH) dalam konteks dokumen tersebut.

---

## CHANGE HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06-29 | AI Agent | Initial policy |
