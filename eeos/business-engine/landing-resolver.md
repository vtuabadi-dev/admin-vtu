# Landing Resolver

---

## DOCUMENT METADATA

| Field | Value |
|-------|-------|
| **Document ID** | EEOS-ENG-007 |
| **Title** | Landing Resolver |
| **Category** | Business Engine — Resolver |
| **Layer** | Level 4 |
| **Status** | ACCEPTED |
| **Version** | v1.0 |

---

## PURPOSE

Engine ini menentukan kota landing (kota pertama yang dikunjungi) berdasarkan hasil ekstraksi AI. Landing menentukan kode kota di Package Code.

---

## BUSINESS DEFINITION

**Landing** = kota pertama dalam itinerary yang menjadi titik kedatangan jamaah.

Untuk paket Umroh/Haji, landing biasanya:

| Route | Landing City |
|-------|-------------|
| Indonesia → Jeddah | `JED` (Jeddah) |
| Indonesia → Madinah | `MED` (Madinah) |
| Indonesia → Riyadh → Jeddah | `RUH` (Riyadh) |

---

## RESOLUTION RULES

| # | Rule |
|---|------|
| LR-01 | Jika itinerary tersedia → ambil kota hari ke-1 |
| LR-02 | Jika itinerary tidak tersedia → ambil dari caption |
| LR-03 | Jika tidak ditemukan → asumsikan Jeddah (default untuk Umroh) |
| LR-04 | Landing harus ada di Master Cities |

---

## DEFAULT LANDING

| Package Type | Default Landing |
|-------------|----------------|
| Umroh Reguler | Jeddah |
| Umroh Plus | Jeddah |
| Haji Khusus | Jeddah / Madinah (tergantung program) |
| Wisata Halal | Tergantung destinasi |

---

## EVIDENCE

- **Source:** `package-ai/alias-resolver.ts` → `resolveCity()`
- **Type:** Production Code
- **Strength:** HIGH

---

## FOUNDATION STATUS

**APPROVED** as Business Engine Resolver.
