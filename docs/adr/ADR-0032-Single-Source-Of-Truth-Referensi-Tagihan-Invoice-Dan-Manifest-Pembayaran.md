# ADR-0032: Single Source of Truth (SSOT) Referensi Tagihan Invoice & Manifest Pembayaran

- **Status:** APPROVED (Product Owner Approved via User Request, 11 November 2026)
- **Date:** 2026-11-11
- **Governance Baseline:** EEOS Governance Baseline v1.2 (FROZEN)
- **Related ADRs:**
  - ADR-0028 (Otomasi Alokasi Pembayaran Satu Kesatuan Invoice dan Distribusi Waterfall Manifest)
  - ADR-0029 (Schema Freeze — No `prisma/schema.prisma` modification)
  - ADR-0031 (Pemisahan Paket Aktif, Paket Arsip & Filter Katalog Otomatis)

---

## 1. Context & Problem Statement

Sebelumnya, perhitungan rincian tagihan, biaya tambahan (*add-on*), dan nominal akhir (*Net Tagihan*) antara modul **Manajemen Invoice** (`CreateInvoiceModal`, `PaymentReviewTab`, `/admin/pembayaran/laporan`, `/admin/pembayaran/[groupId]`) dan **Manifest Pembayaran** (`ManifestPembayaranTable`, `/admin/manifest`, `/api/manifests/template-excel`) merujuk pada sumber dan rumus perhitungan yang berbeda (*Split Reference*):

1. **Perbedaan Fallback Harga Upgrade Kamar:** Modul Invoice/Registrasi memakai fallback hardcoded `2.500.000 / 1.500.000 / 3.750.000`, sedangkan Manifest Pembayaran memakai fallback `4.000.000 / 2.000.000 / 8.000.000` serta fallback base `33.900.000`, dan ekspor Excel memiliki loop perhitungan terpisah.
2. **Phantom Surcharge di Manifest Tanpa Item Tagihan:** Manifest Pembayaran & Excel secara diam-diam membebankan biaya `Thoif` (`750.000/pax`), `Kereta Cepat`, dan `Ongkos Jahit Seragam Jadi` (`100.000/pcs`) dari flag registrasi/perlengkapan meskipun item tersebut **tidak pernah ditambahkan** pada Rincian Tagihan / `InvoiceItem` grup, serta memaksa `Math.max(netTagihan, basePerMember + ongkosJahit)`.
3. **Inkonsistensi Pembatalan & Sinkronisasi Ledger:** `cancelInvoiceItem` pada server action hanya berupa stub (`return null as any`), `invoiceRepo.recalculate` tidak memperbarui `registrationGroup.totalTagihan`, `manifest/page.tsx` belum mendengarkan event realtime `"invoices"`, `resolveJamaahKeretaCepat` & `resolveJamaahCityTourThoif` masih membaca item invoice berstatus `cancelled`, dan modal pembuatan invoice dapat menghidupkan kembali item `Upgrade Kamar` yang sebelumnya telah dihapus dari ledger.

---

## 2. Approved Business Decisions (Product Owner)

Product Owner telah menyetujui dua keputusan bisnis utama sebagai dasar **Single Source of Truth (SSOT)**:

### Keputusan Bisnis 1 — Default Harga Upgrade Kamar
> *"Default harga upgrade kamar langsung mengikuti harga yang sesuai pembuatan paketnya."*

- Tarif dasar paket (`hargaBase`), variasi klaster/varian (`hotelOptions`), serta biaya upgrade kamar (`Double`, `Triple`, `Single`) **wajib** dibaca langsung dari konfigurasi paket keberangkatan terkait (`hotelOptions` varian/klaster yang cocok -> fallback field tingkat `Keberangkatan`).
- Apabila pada pembuatan paket **tidak dikonfigurasi** tarif upgrade kamar (`0` / kosong / tidak terisi), maka default tarif upgrade kamar bernilai **`0`** (`Rp 0`). Seluruh konstanta fallback hardcoded lintas modul (`2.500.000`, `1.500.000`, `3.750.000`, `4.000.000`, `2.000.000`, `8.000.000`, `33.900.000`) **dihapus total**.

### Keputusan Bisnis 2 — Item Non-Include Opsional
> *"Kalau non-include tergantung jamaah akan menambah item tersebut atau tidak, jika ingin menambah item tersebut maka akan tercantum di item rincian tagihan beserta beban biayanya."*

- Item opsional / non-include (termasuk *City Tour Thoif*, *Kereta Cepat*, *Ongkos Jahit Seragam Jadi*, *Paspor*, *Kursi Roda*, *Ongkir*, *Upgrade Hotel*, dsb.) **hanya ditagihkan apabila benar-benar tercantum sebagai `InvoiceItem` aktif** di ledger tagihan grup (`BILL-<groupId>` atau invoice resmi grup).
- Flag registrasi atau status paket (*non-include*) tidak boleh memunculkan biaya bayangan di Manifest Pembayaran atau Ekspor Excel tanpa `InvoiceItem` aktif.
- Tidak ada mekanisme `Math.max(...)` yang menimpa hasil perhitungan ledger bersih (`netTotalTagihan`).

---

## 3. Architectural Decision (Single Source of Truth Engine)

1. **Unified Shared Engine (`src/shared/lib/billing-ssot.ts`):**
   - Seluruh perhitungan tagihan (klasifikasi item, deteksi upgrade kamar/hotel, deduplikasi kanonik per item & per `paxNames`, resolusi harga paket & upgrade kamar per klaster/varian, pengecekan ledger termaterialisasi `hasMaterializedRoomOrFullLedger`, serta kalkulasi kanonik grup `resolveCanonicalGroupBilling`) dipusatkan pada satu modul pure TypeScript yang dipakai bersama oleh:
     - Frontend Invoice (`shared-constants.ts`, `CreateInvoiceModal`, `PaymentReviewTab`, `laporan/page.tsx`)
     - Frontend Manifest (`ManifestPembayaranTable.tsx`, `manifest/page.tsx`)
     - Backend Server Actions & Repositories (`api.ts`, `invoice.repository.ts`, `pembayaran.repository.ts`)
     - API Routes (`template-excel/route.ts`, `perlengkapan/pengambilan/route.ts`, `register/payment-proof/route.ts`)
2. **Materialisasi Ledger Sejak Registrasi Awal:**
   - Saat `RegistrationGroup` dibuat (pendaftaran online maupun `syncPendingRegistrations`), sistem langsung membuatkan ledger awal `BILL-<group.id>` (`TAG-<kodeRegistrasi>`) berisi item `Base Paket` dan (hanya jika `roomUpgradeUnit > 0`) `Upgrade Kamar`.
   - Setelah ledger termaterialisasi (`hasMaterializedRoomOrFullLedger(invoices) === true`), penghapusan atau pembatalan item (`Upgrade Kamar`, `Upgrade Hotel`, `Thoif`, dll.) dari tabel Rincian Tagihan **bersifat permanen dan otoritatif** — UI tidak menginjeksi ulang dari `group.roomUpgrade`, dan Manifest Pembayaran langsung mengikuti angka ledger tersebut.
3. **Kepatuhan ADR-0029 & EEOS v1.2:**
   - Tidak ada perubahan pada `prisma/schema.prisma`.
   - Pembayaran tetap mengikuti aturan distribusi *waterfall* sesuai ADR-0028.

---

## 4. Consequences

- **Positif:** Angka Total Tagihan, Rincian Biaya per Kategori, Potongan/Diskon, Status Hotel & Add-on, serta Sisa Bayar pada Modal/PDF Invoice, halaman Detail Pembayaran Grup, Manifest Pembayaran UI, dan Export Excel selalu identik hingga rupiah terakhir.
- **Perhatian Operasional:** Untuk paket lama yang tidak mengisi tarif upgrade kamar saat pembuatan paket, sistem tidak lagi menyuntikkan asumsi `2,5jt`/`4jt`; admin dapat mengisi nominal upgrade langsung pada item tagihan atau melengkapi konfigurasi varian paket.

