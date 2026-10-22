# ADR-0026: Pemisahan Broadcast Telegram Jalur Manual dan Fitur Broadcast On-Demand di Menu Edit Paket

## Status
PROPOSED (Waiting Product Owner Approval)

## Tanggal
2026-10-22

## Konteks
1. Pada implementasi sebelumnya ([ADR-0006](file:///d:/Projects/app-admin-vtu/docs/adr/ADR-0006-Telegram-Broadcast-Package-Generation.md)), setiap kali admin membuat paket keberangkatan baru melalui menu **Generate Paket** (baik Buat Baru, Split Starting, maupun Split Varian), sistem langsung memicu otomatisasi pengiriman broadcast Telegram di background.
2. Dalam operasional riil:
   - Apabila paket dibuat melalui **Jalur Manual (Formulir)** (bukan via OCR Brosur/Flyer), flyer brosur dan caption marketing **belum tentu tersedia** pada saat pembuatan paket.
   - Mengirim broadcast Telegram tanpa flyer atau dengan caption default yang belum siap menghasilkan broadcast yang tidak lengkap bagi agen/mitra operasional di grup Telegram.
   - Admin memerlukan fleksibilitas untuk membuat struktur paket terlebih dahulu, kemudian melengkapi brosur/flyer dan deskripsi/caption di menu **Katalog Paket** atau menu **Edit Paket**.
3. Diperlukan kontrol on-demand:
   - Admin dapat memicu broadcast Telegram secara manual setelah data flyer dan caption benar-benar lengkap melalui halaman **Edit Paket** (`/admin/keberangkatan/[id]/edit`) yang diakses dari grid card **Paket Aktif** (`/admin/keberangkatan`).
   - Terdapat penanda (indikator ceklis) yang menyatakan secara transparan bahwa paket tersebut **sudah pernah terbroadcast ke Telegram** beserta waktu/riwayatnya, baik di dalam halaman edit maupun pada kartu Paket Aktif.

## Perubahan Aturan Bisnis (Business Rule Changes)
1. **Pemisahan Jalur Generate Paket**:
   - Jika pembuatan paket dilakukan melalui **Jalur Manual** (atau tidak ada flyer brosur yang disertakan saat pembuatan):
     - Sistem **TIDAK** menjalankan broadcast Telegram otomatis.
     - Kolom flyer dan caption bersifat opsional dan fleksibel.
   - Jika pembuatan paket dilakukan melalui **Jalur OCR** dengan flyer brosur dan caption yang telah diekstraksi/diunggah:
     - Broadcast Telegram otomatis tetap dapat dijalankan (atau dijadikan opsional dengan toggle konfirmasi).
2. **Pelengkapan Data di Katalog & Edit Paket**:
   - Admin dapat mengunggah flyer dan memperbarui caption di halaman Katalog Paket maupun melalui halaman Edit Paket.
3. **Fitur Broadcast On-Demand di Menu Edit Paket**:
   - Pada halaman `/admin/keberangkatan/[id]/edit`, ditambahkan section Telegram Broadcast dengan tombol aksi **"Broadcast Paket ke Telegram"**.
   - Tombol ini mengambil flyer yang tersimpan di paket (Google Drive / storage URL / buffer) dan caption yang telah disesuaikan, lalu mengirimkannya ke grup Telegram sesuai starting point paket (Jakarta / Surabaya).
4. **Pelacakan Status Broadcast (Traceability & Checklist Indicator)**:
   - Metadata paket (`driveFolderIds.telegramBroadcast` atau kolom dedicated) menyimpan:
     - `isBroadcasted: boolean`
     - `broadcastedAt: string (ISO Timestamp)`
     - `broadcastedBy?: string (User Name/ID)`
     - `targetGroup?: string (Jakarta / Surabaya)`
   - UI Menu Edit menampilkan info ceklis di samping tombol: `✅ Sudah pernah terbroadcast ke Telegram pada [Tanggal & Jam]`.
   - UI Grid Card Paket Aktif menampilkan lencana/badge status broadcast Telegram (ikon ceklis).

## Keputusan Teknis
1. **Model Data & Penyimpanan Status**:
   - Menggunakan field JSON metadata `driveFolderIds` pada model `Keberangkatan` dengan key `telegramBroadcast`:
     ```json
     {
       "telegramBroadcast": {
         "isBroadcasted": true,
         "broadcastedAt": "2026-10-22T10:30:00.000Z",
         "targetGroup": "surabaya",
         "sentBy": "Admin Operasional"
       }
     }
     ```
   - Pendekatan ini menjaga integritas skema database tanpa downtime migration serta kompatibel dengan seluruh pipeline data Prisma eksisting.
2. **Endpoint API On-Demand**:
   - Dibuat endpoint dedicated: `POST /api/keberangkatan/[id]/broadcast-telegram`.
   - Melakukan validasi izin akses peran (`checkServerPermission(session, "keberangkatan", "edit")`).
   - Mengambil flyer dari storage (Google Drive / local) jika flyerBase64 tidak dikirim langsung dari browser.
   - Memanggil `telegramBroadcastService.sendPackageBroadcast`.
   - Mencatat audit log aktivitas operasional.
3. **Penyesuaian Service Generate**:
   - Pada `package.service.ts` (`createPackageBatch`), periksa apakah parameter mengindikasikan jalur manual atau flyer kosong. Jika ya, lewati pemanggilan `sendPackageBroadcast`.

## Konsekuensi
- **Positif**:
  - Mencegah spam atau broadcast pesan kosong tanpa brosur ke grup Telegram operasional.
  - Memberikan kendali penuh kepada admin untuk memvalidasi flyer dan narasi promosi sebelum dibroadcast.
  - Memberikan kejelasan visual (audit checklist) paket mana yang sudah dibroadcast dan mana yang belum.
- **Negatif**:
  - Admin perlu melakukan satu langkah manual tambahan (klik broadcast di menu edit) jika paket dibuat melalui jalur formulir manual.
