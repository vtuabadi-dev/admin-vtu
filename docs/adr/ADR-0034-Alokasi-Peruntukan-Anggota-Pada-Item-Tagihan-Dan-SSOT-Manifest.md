# ADR-0034: Alokasi Peruntukan Anggota Rombongan (Wajib Setelah Quantity) & Distribusi SSOT Per-Jamaah

- **Status:** Approved & Implemented (Pending Runtime Verification)
- **Tanggal:** 2026-11-12
- **Governance:** EEOS Governance Baseline v1.2 (Bagian 12 — Business Rule & Cross Domain Impact)
- **Relasi ADR:** ADR-0029 (Database Schema Freeze — `prisma/schema.prisma` tidak diubah), ADR-0033 (Audit Log Invoice)

---

## 1. Konteks Masalah

1. Pada modal **Tambah Item Tagihan / Potongan** ([CreateInvoiceModal.tsx](file:///d:/Projects/app-admin-vtu/src/app/admin/pembayaran/laporan/_components/CreateInvoiceModal.tsx), [laporan/page.tsx](file:///d:/Projects/app-admin-vtu/src/app/admin/pembayaran/laporan/page.tsx), [PaymentReviewTab.tsx](file:///d:/Projects/app-admin-vtu/src/app/admin/pembayaran/laporan/_components/PaymentReviewTab.tsx)), pemilihan anggota rombongan sebelumnya hanya muncul untuk item `Upgrade Kamar` / `Upgrade Hotel`. Item lain (seperti *Sewa Kursi Roda*, *Kereta Cepat Haramain*, *Paspor Express*, *Potongan*) tidak menampilkan pemilih anggota penanggung beban dan belum memiliki tombol cepat Quantity **"Semua"**.
2. Pada modal **Ubah Rincian Tagihan**, tidak tersedia bagian pemilih **Diperuntukkan untuk Anggota Rombongan** setelah menentukan **Berapa Banyak (Quantity)**.
3. Akibat item tersimpan tanpa metadata peruntukan dan [billing-ssot.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/billing-ssot.ts) memanggil `distributeAmount` tanpa `eligibleIndices` untuk kategori non-hotel, sistem Manifest Pembayaran & Excel Export membagi rata biaya item ke seluruh anggota rombongan (contoh: *Sewa Kursi Roda Rp 250.000* pada grup 3 Pax `ARDI, IRDA, KAORI` terbagi menjadi `Rp 83.334 / Rp 83.333 / Rp 83.333`).

---

## 2. Keputusan Arsitektur & Aturan Bisnis

1. **Alur Quantity → Pemilihan Anggota (`MemberAllocationSelector.tsx`):**
   - Tepat pada bagian Quantity & Peruntukan pada modal **Tambah Item Tagihan / Potongan**, **Ubah Rincian Tagihan**, dan **Alokasi Item Order**, tersedia tombol cepat **`Semua (${members.length} Pax)`** di samping input angka **Berapa Banyak (Quantity)**.
   - Saat menekan **`Semua`**: `qty` otomatis disamakan dengan jumlah anggota rombongan terdaftar (`members.length`) dan seluruh anggota langsung tercentang.
   - Saat `qty` diisi angka manual (misal `1`), nilai manual tersebut dipertahankan dan tidak ditimpa kecuali pada mode auto-sync khusus *Upgrade Kamar / Hotel* (atau saat pengguna menekan tombol bantu *"Samakan Qty ke X"*).
   - **Validasi wajib pilih penanggung biaya:** Apabila rombongan memiliki daftar anggota (`members.length > 0`), item non-paket-utama (`tambahan` / `potongan`) wajib memiliki minimal 1 anggota tercentang sebelum dapat disimpan. Untuk rombongan dengan 1 anggota saja, anggota tunggal tersebut otomatis terpilih secara default.

2. **Persistensi Tanpa Perubahan Skema DB (ADR-0029):**
   - Menambahkan helper kanonik `parseBillingItemAllocation` dan `formatBillingItemDescriptionWithAllocation` di [billing-ssot.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/billing-ssot.ts) untuk menyimpan dan membaca token `(Peruntukan: Nama1, Nama2)` pada `InvoiceItem.deskripsi` secara idempoten.
   - Memperbarui `getCanonicalItemDedupeKey` agar menormalisasi deskripsi tanpa token `Peruntukan`, sehingga perubahan peruntukan anggota pada invoice yang sudah terbit diperbarui *in-place* via `syncGroupBillingItems` tanpa salah membatalkan item lama.
   - Memperbarui [shared-constants.ts](file:///d:/Projects/app-admin-vtu/src/app/admin/pembayaran/laporan/_components/shared-constants.ts) dan `buildOrderSyncPayload` di [PaymentReviewTab.tsx](file:///d:/Projects/app-admin-vtu/src/app/admin/pembayaran/laporan/_components/PaymentReviewTab.tsx) agar `allocatedJamaah` tersinkron penuh saat simpan & muat ulang.

3. **Distribusi SSOT Per-Jamaah, PDF Invoice & Audit Log:**
   - Pada `resolveCanonicalGroupBilling` di [billing-ssot.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/billing-ssot.ts), `resolveEligibleMemberIndices(item.paxNames, effectiveMembers)` diterapkan ke seluruh kategori tambahan maupun potongan (bukan hanya `upgradeHotel`) sehingga beban hanya dibebankan kepada anggota yang dipilih. Item legacy tanpa token `Peruntukan` tetap fallback aman merata sampai diperbarui.
   - [invoice-pdf.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/invoice-pdf.ts) dan [invoice-audit-log.ts](file:///d:/Projects/app-admin-vtu/src/shared/lib/invoice-audit-log.ts) menormalisasi token `Peruntukan` agar cetakan PDF tidak menggandakan label peruntukan dan perubahan alokasi tercatat sebagai `"updated"` di riwayat log.

---

## 3. Dampak & Verifikasi
- Komponen UI: `MemberAllocationSelector.tsx`, `CreateInvoiceModal.tsx`, `laporan/page.tsx`, `PaymentReviewTab.tsx`.
- Domain SSOT & Output: `billing-ssot.ts`, `shared-constants.ts`, `invoice-pdf.ts`, `invoice-audit-log.ts`.
- Skema Prisma: Tidak berubah (`prisma/schema.prisma` tetap frozen).

