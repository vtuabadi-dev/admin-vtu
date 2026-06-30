# Package Code Generator

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-001 |
| **Title** | Package Code Generator |
| **Category** | Business Engine |
| **Layer** | Level 4 — Business Engine |
| **Taxonomy** | Generator |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Engine ini menghasilkan **Kode Paket** — identifier unik untuk setiap Keberangkatan. Kode ini digunakan di seluruh sistem sebagai referensi paket.

---

## BUSINESS FORMULA

```
KODE = {TYPE}-{CITY}-{MONTH}{YY}
```

### Components

| Component | Source | Format | Example |
|-----------|--------|--------|---------|
| **TYPE** | `packageType` | 3-char uppercase code | `UMR` |
| **CITY** | `startingPoint` | 3-char uppercase city code | `JKT` |
| **MONTH** | `departureDate` | 3-char uppercase month | `JUL` |
| **YY** | `departureDate` | 2-digit year | `26` |

### TYPE Code Mapping

| Package Type | Code |
|-------------|------|
| Umroh Reguler | `UMR` |
| Umroh Plus | `UMP` |
| Haji Khusus | `HKH` |
| Wisata Halal | `WHL` |

---

## EXAMPLES

| Input | Output |
|-------|--------|
| Umroh Reguler, Jakarta, 15 Juli 2026 | `UMR-JKT-JUL26` |
| Umroh Plus Turkiye, Surabaya, 22 Januari 2027 | `UMP-SUB-JAN27` |
| Haji Khusus, Medan, 5 Desember 2026 | `HKH-KNO-DEC26` |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| G-01 | Kode di-generate saat Publish — bukan saat Draft |
| G-02 | Kode bersifat **permanen** — tidak berubah setelah dibuat |
| G-03 | Jika kode sudah ada (duplikat), tambahkan suffix `-2`, `-3`, dst. |
| G-04 | Kode tidak boleh mengandung spasi atau karakter khusus selain `-` |

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Codebase: `package-builder.ts` → `generateKodePaket()` | Production Code | HIGH |
| Package Creation Bot Constitution — Data Extraction Contract A | Constitution | HIGH |

---

## FOUNDATION STATUS

**APPROVED** as Business Engine formula.
