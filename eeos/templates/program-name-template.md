# Program Name Template

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-TMPL-002 |
| **Title** | Program Name Template |
| **Category** | Business Template |
| **Layer** | Level 7 |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Template ini mendefinisikan format **Nama Program** — nama marketing yang ditampilkan ke jamaah.

---

## TEMPLATE

```
{PackageTypeLabel} {City} {Duration} Hari {Month} {Year}
```

### Components

| Token | Source | Example |
|-------|--------|---------|
| `{PackageTypeLabel}` | Package Type → Label | `Umroh Reguler` |
| `{City}` | Starting Point city name | `Jakarta` |
| `{Duration}` | Duration in days | `12` |
| `{Month}` | Departure month (text) | `Juli` |
| `{Year}` | Departure year | `2026` |

---

## PACKAGE TYPE LABELS

| Package Type | Label |
|-------------|-------|
| `umroh_reguler` | `Umroh Reguler` |
| `umroh_plus` | `Umroh Plus` |
| `haji_khusus` | `Haji Khusus` |
| `wisata_halal` | `Wisata Halal` |

---

## VARIATIONS

| Variant | Template | Example |
|---------|----------|---------|
| **Standard** | `{Label} {City} {Duration} Hari {Month} {Year}` | `Umroh Reguler Jakarta 12 Hari Juli 2026` |
| **With Sub-type** | `{Label} {SubType} {City} {Duration} Hari {Month} {Year}` | `Umroh Plus Turkiye Jakarta 15 Hari September 2026` |
| **Short** | `{Label} {Duration} Hari — {Month} {Year}` | `Umroh Reguler 12 Hari — Juli 2026` |

---

## EXAMPLES

| Input | Output |
|-------|--------|
| Umroh Reguler, Jakarta, 12 hari, Juli 2026 | `Umroh Reguler Jakarta 12 Hari Juli 2026` |
| Umroh Plus Turkiye, Surabaya, 15 hari, September 2026 | `Umroh Plus Turkiye Surabaya 15 Hari September 2026` |
| Haji Khusus, Medan, 25 hari, Mei 2027 | `Haji Khusus Medan 25 Hari Mei 2027` |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| PN-01 | Nama program dibuat otomatis saat draft; admin dapat mengedit |
| PN-02 | Nama program bukan identifier — hanya label display |
| PN-03 | Nama program bisa diubah kapan saja tanpa mempengaruhi Package Code |

---

## FOUNDATION STATUS

**APPROVED** as Business Template.
