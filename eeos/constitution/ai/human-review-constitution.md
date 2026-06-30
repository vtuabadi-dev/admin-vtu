# Human Review Constitution

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3B-002 |
| **Title** | Human Review Constitution |
| **Category** | AI Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3B — AI Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan **proses, cakupan, dan aturan Human Review** untuk seluruh output AI di VTU ABADI. Human Review adalah quality gate yang memastikan setiap data yang dihasilkan AI diverifikasi oleh manusia sebelum menjadi data final.

---

## PROBLEM STATEMENT

AI dapat mengekstrak data dengan cepat, tetapi AI juga dapat membuat kesalahan. Tanpa Human Review yang terstruktur:

1. Data salah bisa masuk ke database tanpa terdeteksi
2. Admin tidak tahu field mana yang perlu perhatian khusus
3. Proses review tidak konsisten antar admin
4. Tidak ada jejak audit siapa yang menyetujui apa

---

## BUSINESS OBJECTIVE

1. Memastikan setiap output AI diverifikasi oleh human sebelum menjadi data final
2. Memandu human untuk fokus pada field berisiko tinggi (confidence rendah, konflik)
3. Standarisasi proses review — setiap admin mengikuti alur yang sama
4. Mencatat setiap keputusan review di Audit Trail

---

## MANDATORY REVIEW SCOPE

Field berikut **WAJIB** direview oleh human sebelum draft dapat di-approve:

| # | Review Item | Trigger | Priority |
|---|------------|---------|----------|
| HR-01 | Field confidence < 0.5 | AI tidak yakin dengan hasil ekstraksi | HIGH |
| HR-02 | Field status = CONFLICT | Dua source memberikan data berbeda | HIGH |
| HR-03 | Field status = NEED_MAPPING | AI tidak bisa memetakan ke Master Data | HIGH |
| HR-04 | Semua Mandatory fields | Tanggal, Harga, Maskapai, Durasi | HIGH |
| HR-05 | Harga paket | AI sering salah membaca harga | HIGH |
| HR-06 | Semua departure dates | Multi-date — setiap tanggal harus benar | HIGH |

---

## OPTIONAL REVIEW SCOPE

Field berikut **direkomendasikan** untuk direview — quick check:

| # | Review Item | Reason |
|---|------------|--------|
| HR-07 | Recommended fields | Hotel, Landing, Include |
| HR-08 | Optional fields | Exclude, Promo, Catatan |
| HR-09 | Field confidence > 0.9 | Quick visual check — kemungkinan besar benar |

---

## REVIEW WORKFLOW

```
Admin membuka draft (status: DRAFT)
        │
        ▼
Draft → REVIEW
        │
        ▼
┌───────────────────────────────────────┐
│         HUMAN REVIEW INTERFACE         │
│                                       │
│  HIGH PRIORITY (wajib direview):      │
│  🔴 CONFLICT fields                   │
│  🟡 Low confidence (< 0.5)            │
│  🟠 NEED_MAPPING fields               │
│  🔵 Mandatory fields                  │
│                                       │
│  QUICK CHECK (opsional):              │
│  ✅ High confidence (> 0.9)           │
│  ✅ Recommended fields                │
│  ✅ Optional fields                   │
│                                       │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│            REVIEW DECISION             │
│                                       │
│  APPROVE ALL                          │
│  ├── Semua field VALIDATED            │
│  └── Draft → READY                    │
│                                       │
│  APPROVE PARTIAL                      │
│  ├── Beberapa field VALIDATED         │
│  ├── Sisanya EXTRACTED/MAPPED         │
│  └── Draft → REVIEW (bisa approve     │
│      nanti)                            │
│                                       │
│  EDIT & APPROVE                        │
│  ├── Admin koreksi field              │
│  ├── Field → VALIDATED                │
│  └── Draft → READY                    │
│                                       │
│  REJECT                               │
│  ├── Draft → DRAFT                    │
│  └── Catatan revisi untuk AI/admin    │
│                                       │
└───────────────────────────────────────┘
```

---

## REVIEW DECISIONS

| Decision | Effect on Draft | Effect on Fields |
|----------|----------------|-----------------|
| **Approve All** | Draft → READY | Semua field → VALIDATED |
| **Approve Partial** | Draft tetap REVIEW | Field yang dicek → VALIDATED; sisanya tetap status sebelumnya |
| **Edit & Approve** | Draft → READY | Field dikoreksi → VALIDATED |
| **Reject** | Draft → DRAFT | Semua field tetap; catatan revisi ditambahkan |

---

## MANDATORY ACTIONS PER FIELD STATE

| Field Status | Human Action Required |
|-------------|----------------------|
| **CONFLICT** | Pilih nilai yang benar dari source yang tersedia, atau input manual |
| **NEED_MAPPING** | Pilih Master Data entry yang sesuai; jika tidak ada → eskalasi ke admin lain atau buat Master baru (di luar Bot) |
| **MISSING** | Input manual; jika tidak tahu → biarkan MISSING dan reject draft |
| **EXTRACTED** (confidence < 0.5) | Verifikasi — benar atau perlu koreksi |
| **EXTRACTED** (confidence > 0.5) | Quick visual check |
| **VALIDATED** | Tidak perlu action — sudah disetujui sebelumnya |

---

## REVIEW QUALITY METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Review Coverage** | 100% mandatory items | Mandatory reviewed / total mandatory |
| **Review Time** | < 5 menit per draft | Waktu dari buka draft sampai decision |
| **Error Escape Rate** | < 5% | Field VALIDATED yang ternyata salah / total field |
| **Conflict Resolution Rate** | 100% | CONFLICT resolved / total CONFLICT |

---

## AUDIT TRAIL

Setiap review action wajib dicatat:

| Field | Value |
|-------|-------|
| Actor | Admin ID + Name |
| Action | APPROVE / REJECT / EDIT |
| Draft ID | Reference ke draft |
| Field Changes | Before → After per field |
| Timestamp | ISO datetime |

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `constitution/ai/ai-governance.md`
- `constitution/business/package-creation-bot-constitution.md`
- `constitution/business/raw-mapped-value-contract.md`
- `foundation/auditability-foundation.md`

### Required By
- `constitution/ai/confidence-framework.md`

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as AI Constitution.
