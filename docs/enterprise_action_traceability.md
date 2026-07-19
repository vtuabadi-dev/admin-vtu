# Enterprise Action Traceability
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Immuntability Law
Hukum arsitektur yang mutlak: **Sebuah Activity Event historis TIDAK BOLEH dimodifikasi/dihapus walau sebuah Action Resolusi telah sukses dieksekusi.** Action (Retry, Update, Delete) harus menciptakan *rekam jejak sejarah baru* ke depan.

## 2. Event Chain Generation
Setiap klik Action pada Enterprise Command Center memancarkan event anak (Child Events).

**Contoh Traceability Flow:**
1. Event A: `Payment Failed` (Event asli dari webhook).
2. Action: Auditor mengeklik `[Retry Payment]` di panel EAC.
3. Event B: `Payment Retry Requested` (Mencatat Actor: Budi Auditor, Parent Event: Event A).
4. Event C: `Payment Retry Started` (Mencatat sistem mulai bekerja).
5. Event D: `Payment Retry Success` (Resolusi berhasil didapatkan dari Gateway).

## 3. Menyambung Rantai Bukti (Linking Mechanism)
Untuk merajut Event A, B, C, dan D, EAC mengandalkan atribut JSON wajib pada struktur standar (Event Standard) yang telah ditetapkan:
- `correlation_id`: Menyambung seluruh transaksi dari Generate Paket hingga kepulangan.
- `parent_event_id`: Identifikasi spesifik bahwa Event B, C, D lahir sebagai akibat dari investigasi/penanganan Event A.
- `investigation_id`: Merangkai tumpukan event tersebut ke dalam satu map kasus operasional (Case Management).

Dengan rantai relasional ini, audit trail berjalan utuh dan membentuk pohon historis sebab-akibat (Causality Tree).
