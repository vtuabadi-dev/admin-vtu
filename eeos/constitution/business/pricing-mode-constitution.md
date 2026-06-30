# Pricing Mode Constitution

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-CONST-3A-003 |
| **Title** | Pricing Mode Constitution |
| **Category** | Business Constitution |
| **Layer** | Level 3 — Constitution |
| **Sub-Layer** | 3A — Business Constitution |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |
| **Last Updated** | 2026-06-29 |

---

## PURPOSE

Dokumen ini mendefinisikan dua mode pricing yang didukung oleh VTU ABADI: **Single Pricing** (satu harga untuk semua jamaah) dan **Tier Pricing** (harga berbeda per kelas layanan). Dokumen ini mengatur kapan masing-masing mode digunakan dan bagaimana Tier Pricing akan berevolusi.

---

## PROBLEM STATEMENT

Flyer paket travel memiliki dua pola pricing yang berbeda secara fundamental:

1. **Flyer dengan satu harga** — semua jamaah membayar jumlah yang sama. Ini adalah kasus paling umum untuk paket reguler.

2. **Flyer dengan tier** — terdapat kelas layanan berbeda (Silver, Gold, Platinum) dengan harga berbeda. Ini umum untuk paket premium atau musim tinggi.

Keduanya memerlukan penanganan yang berbeda di database, invoice generation, dan operational workflow. Mencampurkan keduanya dalam satu model akan menghasilkan kompleksitas yang tidak perlu dan potensi error.

---

## BUSINESS OBJECTIVE

1. Mendukung dua mode pricing dengan jelas dan terpisah
2. Single Pricing diimplementasikan segera — ini adalah default
3. Tier Pricing ditunda sampai Invoice Layer siap mendukung harga multi-tier
4. Mencegah implementasi setengah-setengah yang akan menyulitkan di masa depan

---

## PRICING MODES

### Mode 1: Single Pricing

| Attribute | Value |
|-----------|-------|
| **Definition** | Satu harga berlaku untuk seluruh jamaah dalam satu paket |
| **Database** | `Keberangkatan.hargaPaket: Int` |
| **Invoice** | Satu invoice per group/jamaah dengan harga tunggal |
| **Implementation Status** | ✅ SUPPORTED |
| **When to Use** | Flyer hanya menampilkan satu harga |

**Extraction Contract:**
```
pricingMode: "SINGLE"
price: 45500000
```

### Mode 2: Tier Pricing

| Attribute | Value |
|-----------|-------|
| **Definition** | Harga berbeda per kelas layanan (contoh: Silver, Gold, Platinum) |
| **Database** | Belum didukung — memerlukan skema tambahan |
| **Invoice** | Invoice per jamaah dengan harga sesuai tier yang dipilih |
| **Implementation Status** | ❌ DEFERRED |
| **When to Use** | Flyer menampilkan multiple harga dengan label tier |

**Extraction Contract (future):**
```
pricingMode: "TIER"
tiers: [
  { name: "Silver", price: 42000000 },
  { name: "Gold", price: 48000000 },
  { name: "Platinum", price: 55000000 }
]
```

---

## BUSINESS RULES

| # | Rule |
|---|------|
| R-PR-01 | Default mode: SINGLE — digunakan jika flyer hanya memiliki satu harga |
| R-PR-02 | Jika AI mendeteksi multiple harga dengan label berbeda → flag sebagai TIER |
| R-PR-03 | TIER pricing TIDAK BOLEH diimplementasikan sebelum Invoice Layer mendukung multi-harga |
| R-PR-04 | Saat TIER terdeteksi, draft TETAP dibuat dengan mode SINGLE + catatan "Tier pricing detected — needs manual setup" |
| R-PR-05 | Harga di TIER harus berbeda secara signifikan (> 10% antar tier) — jika tidak, kemungkinan duplicate |
| R-PR-06 | Tier pricing saat publish: admin memilih apakah akan membuat 1 paket dengan catatan tier, atau N paket terpisah (1 per tier) |

---

## TIER PRICING EVOLUTION PATH

```
Phase 1 (Current): Single Pricing only
  └── TIER terdeteksi → flag + catatan → human decides

Phase 2 (Future): Invoice Layer supports multi-price
  └── TIER tersimpan di database → invoice generated per tier

Phase 3 (Future): Booking System integration
  └── Jamaah memilih tier saat registrasi → harga otomatis
```

---

## KNOWLEDGE DEPENDENCY

### Depends On
- `constitution/business/package-creation-bot-constitution.md`
- `constitution/business/invoice-constitution.md` (future — untuk Tier)

### Required By
- Invoice generation logic
- Registration flow (jamaah memilih tier)

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Package Creation Bot Constitution — Principle 7 | PO Decision | HIGH |
| Existing codebase: `hargaPaket: Int` single field in Keberangkatan | Production Code | HIGH |
| EEOS Audit — Phase 1 Business Architecture Audit | PO Decision | HIGH |

---

## DECISION TRACE

| Field | Value |
|-------|-------|
| **Primary ADR** | ADR-011 (embedded in Package Creation Bot Constitution) |
| **Business Decision** | PO decision to defer Tier Pricing until Invoice Layer ready |
| **Reasoning** | Tier Pricing requires Invoice Layer to support per-jamaah pricing differentiation. Implementing now without Invoice support would create inconsistencies. |
| **Alternatives Rejected** | (1) Implement Tier immediately with workaround — rejected: creates technical debt; (2) Reject Tier entirely — rejected: business needs multiple pricing tiers |

---

## FOUNDATION STATUS

**APPROVED** — Document is ACCEPTED as Business Constitution. Tier Pricing section is deferred per PO decision.
