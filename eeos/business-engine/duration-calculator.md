# Duration Calculator

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-005 |
| **Title** | Duration Calculator |
| **Category** | Business Engine — Calculator |
| **Layer** | Level 4 |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Engine ini mengekstrak durasi perjalanan (dalam hari) dari caption atau teks flyer.

---

## BUSINESS FORMULA

```
Extract "X HARI" pattern from text
Valid Range: 3 - 45 days
```

---

## INPUT PATTERNS

| Pattern | Example | Extracts |
|---------|---------|----------|
| `X HARI` | `12 HARI` | 12 |
| `X Hari` | `9 Hari` | 9 |
| `X hari` | `15 hari` | 15 |

---

## VALIDATION

| Rule | Action |
|------|--------|
| Duration 3-45 | ✅ Valid |
| Duration < 3 | ⚠️ Warning — unusual |
| Duration > 45 | ⚠️ Warning — mungkin salah ekstraksi |
| Multiple matches | ⚠️ Ambil yang pertama; flag CONFLICT jika berbeda signifikan |
| No match | Field MISSING |

---

## EVIDENCE

- **Source:** `package-ai/caption-parser.ts` → `extractDuration()`
- **Type:** Production Code
- **Strength:** HIGH

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Calculator.
