# ADR-0014: Standarisasi Format ID Reg, Nomor Urut Manifest, Penamaan Dokumen, dan Relokasi File Cloud Saat Pindah Paket

## Status
APPROVED (Product Owner Approved)

## Date
2026-09-04

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), terdapat ketidaksinkronan tampilan identitas jamaah antara halaman Manifest (`/admin/manifest`), Laporan Pembayaran & Invoice (`/admin/pembayaran/laporan`), serta penamaan dokumen di Google Drive.

Sebelumnya:
- Kode registrasi grup di-generate dengan 5 digit (`GRP-YYYY-NNNNN`, contoh `GRP-2026-00004`).
- Di halaman Manifest, fungsi `formatIdRegister` mengalami kesalahan regex sehingga nomor urut grup terpotong dan hanya memunculkan tahun (`2026-1`, `2026-2`).
- Penamaan file dokumen belum konsisten mengadopsi format baku nomor manifest.
- Saat rombongan pindah paket keberangkatan, belum ada mekanisme otomatis yang memindahkan file dokumen jamaah ke folder paket baru di Google Drive sekaligus memperbarui nomor urut manifest pada nama filenya.

Product Owner menetapkan aturan bisnis terpadu untuk:
1. Format ID Reg Grup.
2. Format No Unik ID Reg Jamaah.
3. Penentuan Nomor Urut Manifest (`NO JAMAAH`) berbasis kronologi kedatangan (First-In, First-Out).
4. Standarisasi penamaan file dokumen paspor, pas foto, dan dokumen lainnya.
5. Otomasi relokasi file Google Drive serta re-indexing nomor urut dokumen saat rombongan pindah paket keberangkatan.

## Decision
Sistem menyepakati standarisasi arsitektur sebagai berikut:

### 1. Standarisasi Format ID Reg Grup & No Unik Jamaah
- **No ID Reg Grup**:
  Format: `GRP-[TAHUN]-[4 digit NOMOR GENERATE]`
  Contoh: `GRP-2026-0004` (diperbarui dari sebelumnya 5 digit menjadi 4 digit pad).
- **No Unik ID Reg Jamaah**:
  Format: `[NO ID REG]-[nomor urut grup pendaftar]`
  Contoh:
  - Anggota 1 (Ketua Rombongan): `GRP-2026-0004-1`
  - Anggota 2: `GRP-2026-0004-2`

### 2. Penentuan Nomor Urut di Manifest (`NO JAMAAH`)
- Urutan baris manifest (`NO JAMAAH`) ditentukan secara murni berdasarkan **kronologi siapa yang masuk duluan ke paket keberangkatan tersebut** (First-In First-Served) diurutkan berdasarkan `packageEntryTime`.
- **Aturan Offset Tour Leader (TL)**:
  - **Paket DENGAN Tour Leader**: Penomoran urut jamaah **dimulai dari nomor urut 2** (nomor 1 dicadangkan untuk Tour Leader yang memimpin paket/keberangkatan).
  - **Paket TANPA Tour Leader**: Penomoran urut jamaah **dimulai dari angka 1**.
- Tampilan kolom `ID REGISTER` pada tabel manifest menampilkan **No Unik ID Reg** jamaah secara utuh (misal `GRP-2026-0004-1` / `GRP-2026-00004-1`), memperbaiki bug regex pemotongan string terdahulu.

### 3. Standarisasi Format Penamaan File Dokumen Jamaah
Seluruh dokumen jamaah (Paspor, Pas Foto, KTP, dan dokumen lainnya) yang diunggah ke Google Drive / Cloud Storage menggunakan format ringkas:
`[no urut manifest]-[4 digit id reg]-[nama manifest].[ext]`

> [!NOTE]
> Sesuai instruksi Product Owner, awalan `GRP-[TAHUN]` dan sufiks nomor unik anggota (`-1`, `-2`) **TIDAK DICANTUMKAN** pada nama file dokumen. ID Reg disingkat menjadi **4 digit nomor generate** saja (misal `0004` dari `GRP-2026-0004`).

Contoh (Pada paket dengan Tour Leader, mulai nomor 2):
- Paspor Jamaah 1: `2-0004-MUHAMMAD ATHALLAH RASYID KUSYUDIHYANSYACH.jpg`
- Pas Foto Jamaah 1: `2-0004-MUHAMMAD ATHALLAH RASYID KUSYUDIHYANSYACH.jpg`
- Paspor Jamaah 2: `3-0004-ILHAM.jpg`
- Pas Foto Jamaah 2: `3-0004-ILHAM.jpg`

Contoh (Pada paket tanpa Tour Leader, mulai nomor 1):
- Paspor Jamaah 1: `1-0004-MUHAMMAD ATHALLAH RASYID KUSYUDIHYANSYACH.jpg`
- Paspor Jamaah 2: `2-0004-ILHAM.jpg`

### 4. Mekanisme Otomasi Saat Rombongan Pindah Paket Keberangkatan
Ketika admin melakukan aksi **Pindah Paket** pada suatu grup/rombongan pendaftar:
1. **Penetapan Nomor Urut Baru di Manifest**:
   Grup pendaftar yang dipindahkan otomatis ditempatkan pada **nomor urut paling akhir di paket tujuan yang baru**, meneruskan nomor urut terakhir jamaah yang sudah ada di paket tersebut (didukung oleh pembaruan timestamp `updatedAt` / `packageEntryTime` grup).
2. **Relokasi File Dokumen di Google Drive**:
   Sistem secara otomatis memindahkan (*move file*) seluruh file dokumen jamaah dari rombongan tersebut dari folder Google Drive paket lama ke subfolder paket baru (folder Paspor ke Paspor baru, Foto ke Foto baru, dsb) menggunakan Google Drive API `files.update` dengan `addParents` dan `removeParents`.
3. **Pembaruan Nama File Dokumen (Auto Rename)**:
   Sistem otomatis mengganti nama file (*rename*) di Google Drive untuk mencerminkan nomor urut manifest yang baru di paket tujuan:
   `[no urut manifest baru]-[4 digit id reg]-[nama manifest].[ext]`.
4. **Pembaruan Database & Audit Trail**:
   Field `paketKeberangkatanId` pada grup diperbarui, URL file dokumen pada tabel `DokumenItem` diperbarui, dan histori pergerakan dicatat ke modul `HistoriPaket`.

## Consequences
- **Konsistensi Total Cross-Domain**: ID Reg, No Unik, Nomor Manifest, dan Dokumen Cloud memiliki benang merah yang seragam dan mudah ditelusuri.
- **Integritas Arsip Google Drive**: File paspor dan foto di Google Drive perusahaan selalu terorganisir rapi di bawah folder paket aktif jamaah dengan nomor urut yang selalu sinkron dengan manifest fisik maskapai.
- **Zero Orphaned Files**: Tidak ada dokumen yang tertinggal di folder paket lama saat jamaah berpindah jadwal keberangkatan.
- **Kepatuhan EEOS**: Sesuai Governance Baseline v1.2 Bagian 12, implementasi teknis akan dijalankan segera setelah ADR ini disetujui oleh Product Owner.
