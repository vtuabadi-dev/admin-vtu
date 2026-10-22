# ADR-0028: Otomasi Alokasi Pembayaran Satu Kesatuan Invoice dan Distribusi Waterfall Manifest

## Status
APPROVED (by Product Owner)

## Date
2026-10-22

## Context
Pada form penerimaan pembayaran manual (`/admin/pembayaran/laporan`), saat ini seluruh grup pendaftaran (baik yang memiliki satu kesatuan invoice maupun yang sudah dipecah invoice/kwitansi) diwajibkan mengisi bagian **"Alokasi Pembayaran"** per jamaah secara manual (atau menekan tombol `[Bagi Rata]`). Validasi `totalAlokasi === nominal` memblokir tombol `[Submit Pembayaran]` apabila nominal tidak dialokasikan secara eksplisit per anggota.

Hal ini menimbulkan kendala operasional dan inkonsistensi akuntansi:
1. **Redundansi Input**: Untuk grup pendaftaran yang tidak memecah invoice (`!splitConfig`), invoice adalah satu kesatuan keluarga/rombongan. Admin seharusnya tidak perlu membagi dana per jamaah secara manual karena pembayaran disetorkan sebagai satu kesatuan tagihan invoice grup.
2. **Inkonsistensi Alokasi di Manifest Pembayaran**:
   - Ketika pembayaran disimpan dengan pembagian manual (misal *Bagi Rata* Rp 5.000.000 untuk 2 orang dari total pembayaran Rp 10.000.000), tabel manifest pembayaran membaca array `alokasi` eksplisit tersebut.
   - Akibatnya, setiap anggota grup tercatat hanya mencicil sebagian (keduanya berstatus CICILAN), padahal aturan operasional VTU ABADI menghendaki agar dana masuk melunasi anggota pertama (PIC / urutan -1) terlebih dahulu sampai lunas (`netTagihan === 0`), baru kemudian kelebihan dana (spillover) bergeser melunasi anggota barisan berikutnya (-2, -3, dst).
3. **Pecah Kwitansi (Split Invoice)**:
   - Alokasi pembayaran spesifik hanya relevan dan diperlukan jika grup memang memilih melakukan **Pecah Invoice / Pecah Kwitansi** (`splitConfig && splitConfig.splits.length > 0`), di mana tagihan telah dipisah menjadi beberapa entitas invoice yang berbeda.

## Decision
1. **Kondisionalitas Form Alokasi Pembayaran (`/admin/pembayaran/laporan`)**:
   - Jika grup **tidak memiliki pecah invoice / kwitansi** (`!splitConfig`):
     - Bagian input **"Alokasi Pembayaran"** disembunyikan / tidak ditampilkan.
     - Validasi `handleSubmit` tidak lagi mensyaratkan `alokasiValid` per anggota. Pembayaran langsung diterima dan dicatat sebagai pembayaran grup (`alokasi: []` atau pool grup).
     - Tombol `[Submit Pembayaran]` langsung aktif jika `nominal > 0` dan tidak submitting.
   - Jika grup **memiliki pecah invoice / kwitansi** (`splitConfig && splitConfig.splits.length > 0`):
     - Bagian Alokasi Pembayaran tetap aktif dan relevan untuk memetakan pembayaran ke invoice split yang dituju.
2. **Aturan Distribusi Pembayaran Waterfall pada Manifest (`ManifestPembayaranTable.tsx`)**:
   - Untuk grup dengan satu kesatuan invoice (tanpa split invoice):
     - Seluruh total dana terverifikasi grup (`totalGroupVerifiedCash`) dialokasikan secara **Sequential Waterfall** murni mulai dari jamaah pertama di grup (urutan -1) sampai `netTagihan` jamaah pertama lunas (`totalPembayaran >= netTagihan`).
     - Sisa dana pembayaran yang belum terserap kemudian dialokasikan ke jamaah urutan berikutnya (-2) sampai lunas, dan seterusnya hingga seluruh dana terdistribusi.
     - Status pembayaran jamaah mencerminkan kondisi riil waterfall (`LUNAS` untuk yang sudah tertutupi penuh, `CICILAN` untuk yang tertutupi sebagian, `BELUM BAYAR` untuk yang belum tersentuh dana).

## Consequences
- Admin tidak lagi dibebani keharusan membagi nominal per anggota untuk grup invoice tunggal.
- Alur pelunasan jamaah pada manifest menjadi teratur, transparan, dan sesuai standar operasional VTU ABADI (jamaah urutan pertama lunas lebih dulu).
- Fleksibilitas pecah invoice (ADR-0013) tetap terjaga utuh ketika admin memang sengaja memecah invoice menjadi beberapa kwitansi terpisah.
- Tidak ada perubahan skema database Prisma (backward compatible).
