# Package ID Template

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-TMPL-001 |
| **Title** | Package ID Template |
| **Category** | Business Template |
| **Layer** | Level 7 — Business Templates |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Template ini mendefinisikan format **Kode Paket** — identifier unik untuk setiap Keberangkatan.

---

## TEMPLATE

```
{TYPE}-{CITY}-{MONTH}{YY}
```

### Components

| Token | Description | Format | Example |
|-------|-------------|--------|---------|
| `{TYPE}` | Package type code | 3 uppercase letters | `UMR` |
| `{CITY}` | Departure city code | 3 uppercase letters | `JKT` |
| `{MONTH}` | Departure month | 3 uppercase letters | `JUL` |
| `{YY}` | Departure year | 2 digits | `26` |

---

## TYPE CODE LOOKUP

| Package Type | Type Code |
|-------------|-----------|
| Umroh Reguler | `UMR` |
| Umroh Plus (Turkiye) | `UMP` |
| Umroh Plus (Dubai) | `UMP` |
| Umroh Plus (Eropa) | `UMP` |
| Haji Khusus | `HKH` |
| Wisata Halal | `WHL` |

---

## CITY CODE LOOKUP

| City | Code |
|------|------|
| Jakarta | `JKT` |
| Surabaya | `SUB` |
| Medan | `KNO` |
| Makassar | `UPG` |
| Yogyakarta | `YIA` |
| Denpasar | `DPS` |
| Bandung | `BDO` |
| Solo | `SOC` |
| Palembang | `PLM` |
| Balikpapan | `BPN` |
| Lombok | `LOP` |
| Banda Aceh | `BTJ` |
| Pekanbaru | `PKU` |
| Pontianak | `PNK` |
| Banjarmasin | `BDJ` |
| Manado | `MDC` |

---

## MONTH CODE LOOKUP

| Month | Code |
|-------|------|
| January | `JAN` |
| February | `FEB` |
| March | `MAR` |
| April | `APR` |
| May | `MAY` |
| June | `JUN` |
| July | `JUL` |
| August | `AUG` |
| September | `SEP` |
| October | `OCT` |
| November | `NOV` |
| December | `DEC` |

---

## EXAMPLES

| Input | Output |
|-------|--------|
| Umroh Reguler, Jakarta, 15 Juli 2026 | `UMR-JKT-JUL26` |
| Haji Khusus, Surabaya, 5 Januari 2027 | `HKH-SUB-JAN27` |
| Umroh Plus, Medan, 22 Desember 2026 | `UMP-KNO-DEC26` |

---

## IMMUTABLE PARTS

- Format: `{TYPE}-{CITY}-{MONTH}{YY}` — **permanen**
- Type codes — **permanen** (dikelola via Master Package Types)
- City codes — **permanen** (dikelola via Master Cities)

## VARIABLE PARTS

- Specific values of TYPE, CITY, MONTH, YY depend on the package

---

## FOUNDATION STATUS

**APPROVED** as Business Template.
