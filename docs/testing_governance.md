# Testing Governance

Dokumen ini mendeskripsikan strategi pengujian (Testing Strategy) serta jaminan kualitas (Quality Assurance) yang harus dipatuhi sebelum rilis software.

## 1. Testing Pyramid
Arsitektur pengujian mengikuti model piramida tradisional:
1. **Unit Test (Base)**: Sangat cepat, jumlahnya paling banyak, murni menguji satu fungsi terisolasi (Service layer, utility function).
2. **Integration Test (Middle)**: Memastikan dua atau lebih modul/layer berkolaborasi dengan benar (misalnya interaksi Controller → Service → Database lokal/mock).
3. **E2E Test (Top)**: Pengujian antarmuka utuh (menggunakan tools browser otomatisasi) untuk mensimulasikan perilaku pengguna nyata secara *End-to-End*.

## 2. Unit Test
Kewajiban utama untuk setiap komponen logika bisnis (Domain & Services). Unit test harus mengeksekusi dengan *Mock* atau *Stubs* untuk memutus dependensi sistem eksternal (Database, Network API pihak ketiga).

## 3. Integration Test
Pengujian API endpoints harus difokuskan di level Integration Test. API diberi request, dan respons HTTP di-assert. Menggunakan test database (yang di-reset per iterasi tes) diperbolehkan pada layer ini untuk menjamin kebenaran penulisan ke database.

## 4. E2E Test
E2E (seperti Playwright / Cypress) hanya fokus menguji **Jalur Utama Bisnis** (*Happy Path*) yang paling kritikal (Critical User Journeys), misal:
- Login Admin.
- Pembuatan Master Data utama.
- Transaksi pembayaran.

## 5. Smoke Test
Merupakan himpunan tes sangat cepat yang dieksekusi **PASCA DEPLOYMENT**. Tujuannya murni untuk memastikan infrastruktur tidak rusak dan konfigurasi environment telah tersuntikkan (contoh: endpoint `/health` membalas HTTP 200). Kegagalan Smoke Test berarti Container harus di-Rollback seketika.

## 6. Regression Test
Serangkaian pengujian gabungan untuk membuktikan bahwa perubahan *baru* tidak merusak fitur-fitur *lama*. Regression suites wajib terotomatisasi di CI (Continuous Integration) dan menahan Pipeline apabila ada tes yang gagal.

## 7. User Acceptance Test (UAT)
Eksplorasi aplikasi secara langsung (manual atau dibantu automasi) oleh QA atau *Product Owner* di atas environment staging/preview. UAT menandakan tahap terakhir persetujuan kesiapan fitur dari perspektif bisnis dan perilaku UI.

## 8. Release Validation
Sistem harus selalu merilis versi final setelah melewati gerbang (Gate) otomatisasi dan persetujuan:
1. All Unit / Integration Tests Pass.
2. Build Succesfully Compiled.
3. Deployed to Staging / Preview.
4. E2E & Smoke Test Pass.
5. UAT & PO Approval Pass.

## 9. Coverage Guideline
- Coverage tidak perlu 100% karena angka tinggi tidak selamanya bermakna kualitas tinggi.
- Standar perusahaan menetapkan target **80% Code Coverage** pada Core Business Logic (Layer Service).
- *Excluded from coverage*: Interfaces, Types, DTO definitions, dan konfigurasi environment.
