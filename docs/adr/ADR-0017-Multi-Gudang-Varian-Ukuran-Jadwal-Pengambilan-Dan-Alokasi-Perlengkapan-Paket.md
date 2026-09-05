# ADR-0017: Multi-Gudang, Varian Ukuran, Waktu Pengambilan, Sifat Perlengkapan, dan Alokasi Paket Keberangkatan

- **Status**: PROPOSED (Waiting Product Owner Approval)
- **Tanggal**: 5 September 2026
- **Pengaju**: Technical Architecture Team
- **Domain**: Master Data, Perlengkapan, Manajemen Stok, Pengambilan Jamaah

---

## 1. Konteks dan Permasalahan (Context & Problem Statement)

Kebutuhan operasional penataan perlengkapan jamaah VTU ABADI memerlukan struktur master data dan alokasi stok yang presisi:
1. **Pengelolaan 3 Lokasi Gudang Fisik** (Gudang Utama Surabaya, Gudang Transit Jakarta, Gudang Operasional Bandara).
2. **Master Perlengkapan (3 Tab Sub-Menu)**:
   - **Tab 1: Master Gudang**: Manajemen lokasi gudang, alamat, penanggung jawab.
   - **Tab 2: Master Daftar Barang, Varian Ukuran, & Sifat Barang**:
     - **Klasifikasi 3 Sifat Perlengkapan**:
       1. **Perlengkapan Wajib Umum (Universal Mandatory)** — PASTI didapatkan SELURUH jamaah (termasuk paket *Tanpa Perlengkapan*):
          - Buku Doa (Bisa Diambil Bebas)
          - Slayer (Diambil Hari H)
          - Tas Serut Sandal (Diambil Hari H)
          - Id Card (Diambil Hari H)
       2. **Perlengkapan Paket Standar (Standard Package Inclusions)** — Hanya untuk Paket Standar dengan varian ukuran:
          - Koper Besar
          - Seragam (Kain/Jadi) dengan varian spesifik:
            - *Anak Laki-Laki*: Kemeja No 3, 4, 5, 6, 7, 8, 9, 10
            - *Dewasa Laki-Laki*: Kemeja Ukuran S, M, L, XL, XXL, 4L
            - *Dewasa Perempuan*: Outer Ukuran S, M, L, XL
          - Mukenah (Khusus Perempuan) / Kain Ihrom (Khusus Laki-laki)
          - Cover Paspor
          - Tas Serut Sandal
          - Tas Tenteng Kabin
       3. **Perlengkapan Khusus / Add-On** — Contoh fasilitas Paket Starting Surabaya / Paket Plus:
          - Tas Selempang
          - Khimar (Khusus Perempuan)
          - Sarung Tangan (Khusus Perempuan)
   - **Tab 3: Aturan Alokasi Paket Keberangkatan**: Pemetaan item & varian barang yang berhak didapatkan jamaah berdasarkan jenis paket / kota asal keberangkatan (Starting SUB vs Starting JKT / Plus).

3. **Otomasi Gender & Alur Pengambilan Admin**:
   - Sistem secara otomatis membaca gender jamaah (`jenisKelamin` L/P) dari data pendaftaran awal.
   - Saat modal serah terima dibuka, sistem **otomatis menyaring barang sesuai gender** (Mukenah, Khimar, Sarung Tangan, & Outer hanya muncul untuk perempuan; Kain Ihrom & Kemeja hanya muncul untuk laki-laki).
   - Admin **hanya perlu memilih varian ukuran** (contoh: S/M/L/XL) dan menandai barang yang diserahkan.

---

## 2. Keputusan Arsitektur (Architectural Decision)

### Skema Database Prisma (`schema.prisma`)

1. **Model `MasterGudang`**:
   - `id`: String (cuid)
   - `kodeGudang`: String (unique, contoh: `GDG-SUB`, `GDG-JKT`)
   - `namaGudang`: String
   - `alamat`: String?
   - `penanggungJawab`: String?
   - `isActive`: Boolean

2. **Pengembangan Model `MasterPerlengkapan`**:
   - Tambah kolom `tipePengambilan`: Enum `TipePengambilanPerlengkapan` (`BEBAS_KAPAN_SAJA` | `SERENTAK_HARI_H`).
   - Tambah kolom `sifatPerlengkapan`: Enum `SifatPerlengkapan` (`UMUM_WAJIB` | `PAKET_STANDAR` | `ADDON_KHUSUS`).
   - Tambah kolom `genderTarget`: Enum `GenderTarget` (`ALL` | `LAKI_LAKI` | `PEREMPUAN`).
   - Relasi ke varian ukuran `BarangUkuran[]`.

3. **Model `MasterPerlengkapanUkuran` (Varian Ukuran)**:
   - `id`: String (cuid)
   - `barangId`: String (FK to MasterPerlengkapan)
   - `kelompokUkuran`: String (contoh: `ANAK_LAKI`, `DEWASA_LAKI`, `DEWASA_PEREMPUAN`, `STANDAR`)
   - `kodeUkuran`: String (contoh: `3`..`10`, `S`..`XXL`, `4L`, `STD`)
   - `namaUkuran`: String
   - Relasi stok per gudang `StokGudangItem[]`.

4. **Model `StokGudangItem` (Stok Fisik Per Gudang)**:
   - `gudangId`: String (FK to MasterGudang)
   - `ukuranId`: String (FK to MasterPerlengkapanUkuran)
   - `stokTersedia`: Int
   - `ambangBatasMin`: Int

5. **Model `PaketPerlengkapanRule` (Alokasi Per Paket Keberangkatan)**:
   - `id`: String (cuid)
   - `startingPoint`: String (contoh: `SUB`, `JKT`, `PLUS`)
   - `barangId`: String (FK)
   - `wajibPilihUkuran`: Boolean

---

## 3. Konsekuensi dan Dampak (Consequences)

- **Positif**:
  - Admin menghemat waktu karena tidak perlu memilih gender secara manual saat serah terima.
  - Khimar dan Sarung Tangan otomatis hanya dialokasikan untuk jamaah perempuan.
  - Pilihan ukuran seragam presisi sesuai kategori usia & gender jamaah (Anak Laki No 3-10, Dewasa Laki S-4L, Dewasa Perempuan Outer S-XL).
  - Jamaah paket *Tanpa Perlengkapan* tetap menerima item **Wajib Umum** (Buku Doa, Slayer, Tas Serut Sandal, ID Card).
- **Status Governance**: EEOS Governance Baseline v1.2 (Waiting Product Owner Approval).
