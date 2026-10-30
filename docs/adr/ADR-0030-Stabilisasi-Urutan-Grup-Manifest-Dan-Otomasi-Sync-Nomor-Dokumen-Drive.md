# ADR-0030: Stabilisasi Urutan Grup Manifest dan Otomasi Re-Sync Nomor Dokumen Google Drive Saat Penambahan Jamaah

## Status
APPROVED (Product Owner Approved)

## Date
2026-10-30

## Context
Pada alur operasional PT Vauza Tamma Abadi (VTU ABADI Travel), saat suatu rombongan/grup pendaftar (`RegistrationGroup`) yang sudah terdaftar pada suatu paket keberangkatan mengalami penambahan jamaah baru (via modul Pembayaran/Laporan maupun Manifest), terjadi anomali perilaku:
1. **Pergeseran Posisi Grup ke Paling Bawah**:
   Seluruh anggota dari grup yang ketambahan jamaah tersebut tiba-tiba bergeser posisinya ke urutan paling bawah dalam tabel manifest (`/admin/manifest`), ekspor manifest Excel (`/api/manifests/template-excel`), dan indeks Google Drive (`manifest-drive-sync.service.ts`).
2. **Akar Masalah (Root Cause - CONFIRMED)**:
   Sistem sebelumnya (sejak ADR-0014) menggunakan field `updatedAt` pada tabel `RegistrationGroup` sebagai representasi timestamp masuknya rombongan ke paket (`packageEntryTime = updated || created`).
   Karena Prisma secara otomatis memperbarui field `@updatedAt` setiap kali ada operasi `prisma.registrationGroup.update` (termasuk penambahan kuota jamaah, penambahan tagihan, dan update pembayaran), grup tersebut otomatis memiliki `updatedAt` paling baru di antara grup lainnya. Akibatnya, sorting kronologis berbasis `updatedAt` menggeser grup tersebut ke urutan terakhir.
3. **Ketidaksinkronan Nomor Dokumen di Google Drive**:
   Ketika posisi rombongan tetap berada di tengah dan ketambahan 1 jamaah baru, nomor urut jamaah di bawah rombongan tersebut otomatis bergeser (+1, +2, dst). Namun, belum ada trigger otomatis yang mereset dan men-sinkronisasi ulang nomor urut pada nama file dokumen (paspor, foto) yang sudah terunggah di Google Drive untuk jamaah-jamaah yang nomor urutnya bergeser tersebut.

Product Owner menginstruksikan aturan bisnis terpadu:
1. Posisi grup/rombongan di dalam manifest paket keberangkatan harus **tetap stabil di posisi awalnya**, tidak boleh bergeser ke bawah saat ketambahan anggota jamaah baru.
2. Penambahan jamaah baru langsung masuk menjadi **satu baris data baru di dalam rombongan tersebut** (menambah baris untuk jamaah baru di rombongannya), dan nomor urut jamaah di bawahnya bergeser secara wajar.
3. Penambahan jamaah baru harus menjadi **trigger otomatis di background** untuk mereset dan menyinkronkan kembali urutan nomor urut pada nama dokumen Google Drive yang sudah terupload pada paket tersebut.
4. **Isolasi Paket Ketat (Strict Package-Level Isolation)**:
   Trigger reset/sinkronisasi nomor urut nama file dokumen Google Drive **HANYA BERLAKU UNTUK FILE DOKUMEN PAKET KEBERANGKATAN YANG BERSANGKUTAN SAJA**. Sistem dilarang keras menyentuh, membaca ulang, atau mengubah nama file dokumen milik paket keberangkatan lainnya.

## Decision
Sistem menyepakati standarisasi arsitektur sebagai berikut:

### 1. Pemisahan `packageEntryTime` dari Mutable `updatedAt`
- Menambahkan field `packageEntryTime` (`DateTime @default(now())`) pada model `RegistrationGroup`.
- Waktu masuk paket (`packageEntryTime`) hanya ditentukan saat:
  - Grup pertama kali dibuat pada paket tersebut (`packageEntryTime = createdAt`).
  - Grup dipindahkan (*pindah paket*) ke paket keberangkatan baru via `transferPackageGroup` (`packageEntryTime = now()`).
- Operasi penambahan jamaah baru (`addJamaahToGroup`), penyesuaian tagihan, pembayaran, atau pengubahan profil anggota **DILARANG** mengubah `packageEntryTime`.
- Seluruh pengurutan manifest dan penomoran dokumen diurutkan secara deterministik berdasarkan `packageEntryTime ASC, createdAt ASC`.

### 2. Penambahan Jamaah sebagai Baris Baru di Bawah Rombongan
- Jamaah baru yang ditambahkan ke rombongan langsung menempati nomor urut berikutnya di dalam rombongan tersebut (misal rombongan 2 orang menjadi 3 orang: `GRP-2026-0004-1`, `GRP-2026-0004-2`, `GRP-2026-0004-3`).
- Tampilan tabel manifest di web maupun file export Excel langsung menampilkan jamaah baru ini tepat di baris rombongannya tanpa memindahkan rombongan ke bawah.
- Seluruh jamaah di rombongan sesudahnya secara matematis bergeser nomor urut manifestnya (`nomorUrut + N`).

### 3. Otomasi Background Trigger Re-Sync Dokumen Google Drive dengan Isolasi Paket
- Pada action `addJamaahToGroup` (dan aksi penambahan jamaah terkait), setelah transaksi database berhasil disimpan (post-commit), sistem secara otomatis memicu background execution dari:
  ```typescript
  syncPackageDocumentFileNamesToDrive(group.paketKeberangkatanId);
  ```
- **Strict Package-Level Isolation**:
  Fungsi `syncPackageDocumentFileNamesToDrive(keberangkatanId)` mengunci query database secara spesifik hanya pada `where: { paketKeberangkatanId: keberangkatanId }`. Folder dan file dari paket keberangkatan lain tidak akan diakses maupun diubah sama sekali.
- Background job ini berjalan secara non-blocking (*fire-and-forget* dengan error logging yang terisolasi) sehingga tidak memperlambat respon antarmuka pengguna admin.
- Fungsi `syncPackageDocumentFileNamesToDrive` akan memeriksa seluruh dokumen jamaah pada paket terkait dan me-rename file di Google Drive agar nomor urut pada nama filenya (`[no urut manifest]-[4 digit id reg]-[nama manifest].[ext]`) kembali 100% sinkron dengan nomor urut manifest terbaru.

## Consequences
- **Stabilitas Urutan Rombongan**: Rombongan yang telah terdaftar tidak akan pernah melompat ke urutan paling bawah hanya karena penambahan jamaah atau perubahan data administratif.
- **Integritas Penomoran Dokumen Cloud**: Google Drive selalu rapi dan sinkron secara otomatis dengan nomor urut manifest fisik maskapai/hotel tanpa memerlukan intervensi manual dari admin.
- **Isolasi Aman Lintas Paket**: Tidak ada risiko terjadinya salah rename atau konflik nomor dokumen antar paket keberangkatan yang berbeda.
- **Kepatuhan EEOS v1.2**: Mengikuti Engineering Evidence Standard dan Governance Baseline v1.2.
