# Alias Resolver

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-002 |
| **Title** | Alias Resolver |
| **Category** | Business Engine |
| **Layer** | Level 4 — Business Engine |
| **Taxonomy** | Resolver |
| **Status** | ACCEPTED |
| **Version** | v1.0 |
| **Owner** | Product Owner |
| **Created** | 2026-06-29 |

---

## PURPOSE

Engine ini menerjemahkan **alias / variasi nama** dari hasil ekstraksi AI ke **Master Data entry**. Contoh: "Saudia Airlines", "Saudia", "saudia" → Master Airlines ID `MA-001`.

---

## BUSINESS PROBLEM

Flyer dan caption menggunakan nama yang bervariasi untuk entitas yang sama:
- "Garuda", "Garuda Indonesia", "GA" → semua merujuk ke maskapai yang sama
- "Jakarta", "JKT", "Cengkareng" → semua merujuk ke kota yang sama
- AI tidak bisa langsung memetakan variasi ini ke Master Data

Alias Resolver menjembatani variasi nama dengan Master Data.

---

## BUSINESS RULES

| # | Rule |
|---|------|
| AR-01 | Resolver membaca dari **Master Alias Registry** — bukan hardcoded |
| AR-02 | Jika ditemukan exact match → langsung resolve |
| AR-03 | Jika ditemukan partial match → return candidate list, confidence < 1.0 |
| AR-04 | Jika tidak ditemukan → return null, field status: NEED_MAPPING |
| AR-05 | Alias bersifat **case-insensitive** |
| AR-06 | Alias Registry dikelola oleh Admin melalui admin panel |

---

## RESOLUTION STRATEGY

| Match Type | Action | Confidence |
|-----------|--------|-----------|
| **Exact match** | Langsung resolve ke Master ID | 1.0 |
| **Alias match** | Resolve via Alias Registry | 0.90 |
| **Fuzzy match** | Return top 3 candidates | 0.50-0.70 |
| **No match** | Return null; NEED_MAPPING | 0.0 |

---

## ALIAS REGISTRY STRUCTURE

Setiap Master Data entry memiliki array alias:

```
Master Airlines: "Garuda Indonesia"
Aliases: ["Garuda", "Garuda Indonesia", "GA", "Garuda Air"]
```

Alias Registry dikelola sebagai bagian dari Master Data — bukan hardcoded di source code.

---

## EVIDENCE

| Evidence | Type | Strength |
|----------|------|----------|
| Codebase: `alias-resolver.ts` → `resolveAirline()`, `resolveCity()` | Production Code | HIGH |
| Hardcoded aliases found: 13 airlines, 17 cities | Production Code | HIGH |

---

## MIGRATION NOTE

**Current state:** Alias disimpan sebagai hardcoded array di `alias-resolver.ts`.
**Target state:** Alias disimpan di database melalui Master Data + Alias Registry.
**Migration:** Extract alias arrays → seed `master_airlines` + `master_cities` + `master_alias_registry` tables.

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Resolver.
