# ADR-0013: Fleksibilitas Alokasi Dana Pembayaran Awal dan Proporsi Tagihan Split Invoice

## Status
PROPOSED (Awaiting Product Owner Approval)

## Date
2026-09-04

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), fitur **Pecah Invoice (Split Invoice)** memungkinkan satu grup pendaftaran (misal 2 atau lebih jamaah) dipecah menjadi beberapa invoice penagihan mandiri (misal: Invoice A dan Invoice B) untuk kebutuhan penagihan terpisah per keluarga atau per individu.

Sebelumnya, terdapat dua kendala utama saat invoice di-split:
1. **Pembayaran Sebelum Split Menghilang**: Dana pembayaran yang telah disetor sebelum split (misal DP pendaftaran grup Rp 15.000.000 untuk 2 pax) disimpan tanpa alokasi anggota spesifik (`alokasi: []`). Ketika admin berpindah ke tab Invoice A atau Invoice B, filter memeriksa relasi anggota pada tabel alokasi sehingga pembayaran awal tersebut tidak muncul di kedua invoice ("Belum ada pembayaran untuk Invoice B").
2. **Kuantitas Tagihan Belum Terisolasi per Split**: Tabel Rincian Tagihan & Potongan tetap menampilkan kuantitas dan total nominal keseluruhan grup (misal: Paket 2 Pax Rp 71.800.000), bukan kuantitas anggota yang dialokasikan pada invoice tersebut (misal: 1 Pax Rp 35.900.000).

Product Owner menetapkan aturan bisnis baru:
- **Kuantitas & Rincian Tagihan**: Saat membuka tab invoice tertentu (misal Invoice A), tabel tagihan hanya menampilkan kuantitas (*quantity*) dan nominal yang dicantumkan ke invoice tersebut. Ditambahkan pula tab `[Semua / Gabungan Group]` untuk melihat rekapitulasi menyeluruh.
- **Fleksibilitas Alokasi Pembayaran**: Sistem dilarang membagi dana yang telah disetor secara otomatis sama rata tanpa persetujuan admin. Pada saat split dilakukan di modal, admin dapat mengatur secara fleksibel berapa nominal dana yang dialokasikan ke Invoice A dan berapa dana yang dialokasikan ke Invoice B (dengan opsi tombol cepat "Bagi Rata").

## Decision
1. **Penyempurnaan Modal Pecah Invoice (`SplitInvoiceModal`)**:
   - Jika grup telah memiliki riwayat pembayaran terverifikasi (*Total Dibayar > 0*), modal menampilkan bagian konfigurasi alokasi dana:
     `Alokasi Pembayaran yang Sudah Diterima (Total: Rp X.XXX.XXX)`.
   - Admin dapat menentukan alokasi dana per invoice split secara spesifik dengan input nominal mandiri.
   - Disediakan tombol aksi cepat: `[Bagi Rata]`, `[Alokasikan Penuh ke Invoice A]`, dsb.
   - Validasi real-time memastikan total alokasi sesuai dengan total pembayaran yang telah diterima.

2. **Penyimpanan Alokasi ke Database (`AlokasiPembayaran`)**:
   - Saat split disimpan, fungsi `saveInvoiceSplitConfig` mengupdate relasi data `AlokasiPembayaran` pada record pembayaran terkait di database sehingga tiap anggota dalam invoice split menerima alokasi dana yang telah disepakati.

3. **Isolasi Tampilan Kuantitas & Tagihan per Split**:
   - Pada tab split (misal Invoice A):
     - Kuantitas item paket utama disesuaikan dengan jumlah anggota di split tersebut (`activeSplit.anggotaIds.length`).
     - Total tagihan dan sisa pembayaran dihitung proporsional terhadap anggota di split tersebut.
     - Riwayat pembayaran menampilkan nominal yang teralokasi khusus untuk invoice tersebut.
   - Pada tab `Semua (Group)`:
     - Menampilkan kuantitas total grup dan seluruh pembayaran gabungan.

## Consequences
- Kuantitas dan rincian nominal pada setiap invoice split menjadi 100% akurat dan independen.
- Dana yang telah disetor sebelum split tidak hilang dan dialokasikan secara transparan sesuai kehendak admin/jamaah.
- Admin memiliki fleksibilitas penuh dalam pembagian dana tanpa adanya kalkulasi paksa sama rata dari sistem.
- Sesuai dengan standar kepatuhan tata kelola EEOS Baseline v1.2.
