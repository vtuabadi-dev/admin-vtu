# Confidence Framework

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3B-003 |
| **Title** | Confidence Framework |
| **Category** | AI Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3B — AI Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan **Confidence Framework** — sistem penilaian keyakinan AI terhadap setiap field hasil ekstraksi. Confidence adalah alat bantu Human Review, bukan pengambil keputusan otomatis.

---

## PROBLEM STATEMENT

AI mengekstrak data dengan tingkat keyakinan yang berbeda-beda. Tanpa confidence score:

1. Human tidak tahu field mana yang perlu perhatian khusus
2. Semua field terlihat sama — padahal ada yang akurat dan ada yang tebakan
3. Human membuang waktu memverifikasi field yang sudah pasti benar
4. Tidak ada prioritas review — field berisiko bisa terlewat

---

## BUSINESS OBJECTIVE

1. Setiap field hasil ekstraksi AI memiliki confidence score 0.0 - 1.0
2. Confidence memandu human untuk fokus pada field berisiko
3. Confidence BUKAN pengambil keputusan — human tetap memverifikasi
4. Confidence rendah tidak memblokir — hanya mengeskalasi ke human

---

## CONFIDENCE SCALE

| Score Range | Label | Meaning | Review Action |
|-------------|-------|---------|---------------|
| 0.90 - 1.00 | **High** | AI sangat yakin — teks jelas, pola cocok | Quick visual check |
| 0.70 - 0.89 | **Medium** | AI cukup yakin — minor uncertainty | Normal review |
| 0.50 - 0.69 | **Low** | AI kurang yakin — teks blur, pola parsial | Priority review |
| 0.00 - 0.49 | **Very Low** | AI tidak yakin — perlu verifikasi | Wajib review; field status → NEED_REVIEW |

---

## CONFIDENCE FACTORS

Confidence score dihitung berdasarkan:

| Factor | Weight | Description |
|--------|--------|-------------|
| **OCR Quality** | 30% | Kejelasan teks di gambar (blur, resolusi, kontras) |
| **Pattern Match Strength** | 40% | Seberapa cocok extracted value dengan expected pattern |
| **Source Agreement** | 20% | Apakah multiple source memberikan nilai yang sama? |
| **Context Consistency** | 10% | Apakah nilai konsisten dengan field lain? (contoh: tanggal > hari ini) |

---

## PER-FIELD CONFIDENCE (MANDATORY)

Setiap field dalam extraction result WAJIB membawa confidence score individual:

```
field: "maskapai"
rawValue: "Garuda Indonesia"
confidence: 0.95
confidenceFactors: {
  ocrQuality: 0.98,
  patternMatch: 0.95,
  sourceAgreement: 0.90,
  contextConsistency: 1.00
}
```

**TIDAK BOLEH** hanya memberikan satu confidence score global untuk seluruh extraction.

---

## AGGREGATE CONFIDENCE

Confidence aggregate = rata-rata seluruh field confidence:

```
aggregateConfidence = SUM(field.confidence) / COUNT(fields)
```

Digunakan sebagai **indikator umum** kualitas extraction — BUKAN pengganti per-field confidence.

---

## CONFIDENCE THRESHOLD RULES

| Threshold | Action |
|-----------|--------|
| `confidence < 0.5` | Field status → NEED_REVIEW; highlight visual MERAH |
| `confidence < 0.3` | Field status → NEED_REVIEW; tambah warning "AI sangat tidak yakin" |
| `confidence = 0.0` | Field status → MISSING (jika tidak ada data) atau NEED_REVIEW (jika ada data tapi AI tidak yakin) |

---

## CONFIDENCE VISUAL GUIDE (Human Review UI)

| Confidence | Visual Indicator |
|-----------|-----------------|
| > 0.9 | 🟢 Hijau — "AI yakin" |
| 0.7 - 0.9 | 🟡 Kuning — "AI cukup yakin" |
| 0.5 - 0.7 | 🟠 Orange — "Perlu dicek" |
| < 0.5 | 🔴 Merah — "Wajib diverifikasi" |

---

## ANTI-PATTERNS (TIDAK BOLEH)

| Anti-Pattern | Why Wrong |
|-------------|-----------|
| Confidence = 1.0 untuk semua field | Tidak realistis — pasti ada variasi |
| Confidence tanpa faktor | Tidak dapat dijelaskan — black box |
| Confidence digunakan untuk auto-approve | Melanggar Human Authority Principle |
| Confidence dimanipulasi untuk menghindari review | Melanggar AI Governance |
| Global confidence tanpa per-field breakdown | Tidak membantu human review per field |

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `constitution/ai/ai-governance.md`
- `constitution/ai/human-review-constitution.md`
- `constitution/business/raw-mapped-value-contract.md`

### Required By
- `business-engine/confidence-aggregator.md`
- `business-engine/completeness-calculator.md`

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as AI Constitution.
