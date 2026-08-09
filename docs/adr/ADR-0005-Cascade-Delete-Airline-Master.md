# ADR-0005: Kebijakan Penghapusan Data Master Maskapai Berelasi (Cascade Delete)

## Status
APPROVED

## Tanggal
2026-08-09

## Konteks
Saat ini, master data Maskapai (`MasterAirline`) tidak dapat dihapus secara fisik jika ID maskapai tersebut masih digunakan/direferensikan oleh data keberangkatan (`Keberangkatan.maskapaiId`). Hal ini disebabkan oleh batasan integritas referensial database (Foreign Key constraint).

Product Owner menginstruksikan bahwa penghapusan data berelasi diperbolehkan, dengan syarat disediakan 2 opsi penghapusan kepada pengguna di UI:
1. **Soft Delete (Deaktivasi)**: Menonaktifkan data master sehingga tidak bisa dipilih lagi di masa depan, tetapi data transaksi historis tetap utuh.
2. **Hard Delete (Hapus Permanen)**: Menghapus data secara fisik beserta seluruh data transaksi yang merujuk kepadanya secara berantai (*cascade*). Karena tindakan ini merusak data operasional secara luas, maka wajib ada konfirmasi ganda (*double confirmation*) yang ketat untuk memastikan kesadaran penuh dari pengguna.

## Opsi yang Dipertimbangkan

### Opsi A: Menerapkan Cascade Delete pada Skema Prisma & Endpoint Terpisah
- Menambahkan `onDelete: Cascade` pada relasi `Keberangkatan` dan tabel anak-anaknya di `schema.prisma`.
- Memperluas API `DELETE` master data dengan parameter query `mode=soft` (default) dan `mode=hard`.
- Di tingkat frontend, tombol hapus akan memicu modal interaktif untuk memilih mode hapus, dengan konfirmasi ekstra jika memilih *Hard Delete*.
- **Konsekuensi**:
  - **Positif**: Memberikan fleksibilitas penuh kepada admin untuk melakukan pembersihan data jika terjadi kesalahan input di awal, dengan proteksi konfirmasi ganda untuk mencegah kecelakaan.
  - **Negatif**: Mengubah struktur skema relasi di Prisma client dan database PostgreSQL, memerlukan migrasi database.

### Opsi B: Penanganan Cascade Manual di Service Layer
- Menangani penghapusan data relasi secara manual satu per satu di tingkat kode TypeScript service layer sebelum menghapus data maskapai utama.
- **Konsekuensi**:
  - **Negatif**: Kode program menjadi sangat panjang, rentan terhadap bug jika ada tabel baru yang ditambahkan di kemudian hari, dan performanya kurang optimal dibanding cascade tingkat database.

## Keputusan
Memilih **Opsi A (Cascade Delete pada Skema Prisma & Endpoint Terpisah)** karena lebih konsisten, performa lebih baik, dan minim risiko kegagalan transaksi di tengah jalan (*partial delete*).

Langkah Implementasi:
1. **Database Schema**: 
   Ubah relasi di `prisma/schema.prisma` (dan `src/server/db/schema.prisma`) dengan menambahkan `onDelete: Cascade` pada:
   - Relasi `maskapaiMaster` di model `Keberangkatan`.
   - Relasi `keberangkatan` di model `RegistrationGroup`.
   - Relasi `keberangkatan` di model `Manifest`.
   - Relasi `keberangkatan` di model `Rooming`.
   - Relasi `keberangkatan` di model `ActivityEvent`.
   - Relasi `keberangkatan` di model `AutoDeadline`.
2. **Backend API**:
   - Perbarui API route `DELETE /api/master/airlines/[id]` agar membaca query parameter `mode`.
   - Jika `mode=hard`, jalankan hapus fisik (`masterDataService.deleteAirline(id)`).
   - Jika `mode=soft` (atau tidak dikirim), jalankan update status nonaktif (`masterDataService.updateAirline(id, { isActive: false })`).
3. **Frontend UI**:
   - Perbarui komponen `CrudTab` agar ketika tombol hapus diklik, tidak menggunakan `confirm` bawaan browser, melainkan membuka Modal dialog kustom.
   - Modal tersebut akan menyajikan opsi:
     - **Nonaktifkan saja (Soft Delete - Aman)**
     - **Hapus Permanen beserta Data Terkait (Hard Delete - Berbahaya)**
   - Jika memilih Hard Delete, tampilkan kolom teks verifikasi bertuliskan *"Saya menyadari data akan dihapus permanen"*. Tombol hapus hanya akan aktif setelah teks verifikasi tersebut diketik dengan benar oleh user.

## Konsekuensi
- **Positif**:
  - Memberikan fleksibilitas penuh bagi pengguna untuk mengelola data master.
  - Proteksi konfirmasi ganda meminimalisir risiko penghapusan tidak sengaja.
  - Skema database bersih dan terstruktur karena cascade diatur di tingkat skema.
- **Negatif**:
  - Memerlukan migrasi skema database (`npx prisma generate` dan sinkronisasi migration).
