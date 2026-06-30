# Master Airlines

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-MASTER-001 |
| **Title** | Master Airlines |
| **Category** | Master Data |
| **Layer** | Level 5 — Master Data |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Managed By** | Admin (via admin panel) |
| **Created** | 2026-06-29 |

---

## PURPOSE

Master Airlines mendefinisikan **seluruh maskapai yang dikenal** oleh sistem VTU ABADI. AI TIDAK BOLEH membuat entri baru — hanya Human/Admin yang dapat menambah maskapai ke Master Data.

---

## DATA STRUCTURE

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | Text (PK) | Unique identifier | `MA-001` |
| `nama` | Text | Nama resmi maskapai | `Garuda Indonesia` |
| `kodeIATA` | Text (2-char) | IATA airline code | `GA` |
| `isActive` | Boolean | Active status | `true` |
| `aliases` | Text[] | Variasi nama | `["Garuda", "Garuda Indonesia", "GA"]` |

---

## DISCOVERED AIRLINES (from codebase)

Airlines discovered in `package-ai/alias-resolver.ts`:

| Name | IATA Code |
|------|-----------|
| Saudia Airlines | SV |
| Garuda Indonesia | GA |
| Lion Air | JT |
| Emirates | EK |
| Qatar Airways | QR |
| Turkish Airlines | TK |
| Batik Air | ID |
| Citilink | QG |
| AirAsia | AK |
| Super Air Jet | IU |
| Pelita Air | IP |

---

## BUSINESS RULES

| # | Rule |
|---|------|
| MA-01 | AI TIDAK BOLEH menambah entri baru — hanya Admin |
| MA-02 | Maskapai yang tidak ada di Master → field status NEED_MAPPING |
| MA-03 | Admin dapat menambah, mengedit, menonaktifkan maskapai via admin panel |
| MA-04 | Alias digunakan oleh Alias Resolver untuk fuzzy matching |
| MA-05 | `isActive = false` → maskapai tidak muncul di suggestion |

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Codebase: `alias-resolver.ts` — 13 hardcoded airlines with IATA codes | Production Code | HIGH |
| Package Creation Bot Constitution — Principle 4 (Master Data) | Constitution | HIGH |

---

## MIGRATION STATUS

🟡 **Needs migration**: Data currently hardcoded in `alias-resolver.ts`. Must be migrated to database table `master_airlines` with alias registry.

---

## FOUNDATION STATUS

**APPROVED** as Master Data domain.
