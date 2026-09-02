# ADR-0010: Workflow Undangan Admin & Token Setup Password Mandiri

**Status**: ACCEPTED / APPROVED  
**Tanggal**: 2 September 2026  
**Domain**: Authentication, User Governance, Security & Notification  
**Baseline**: EEOS Baseline v1.2  

---

## 1. Konteks (Context)

Saat ini, penambahan user/admin baru melalui halaman **Manajemen User & Hak Akses (`/admin/users`)** mengharuskan Super Admin menuliskan password awal (*initial password*) secara manual dalam modal form `Tambah Admin Baru`.

Pendekatan ini memiliki beberapa keterbatasan:
1. **Risiko Keamanan**: Super Admin mengetahui password awal user lain dan password tersebut berpotensi terkirim secara plaintext melalui percakapan manual.
2. **Pengalaman Pengguna (UX)**: Admin baru tidak dapat menentukan password pribadi mereka sendiri sejak awal dan memerlukan langkah pergantian password terpisah.
3. **Standar Keamanan Modern**: Alur pengelolaan user profesional mewajibkan penggunaan *Email Invitation & Token Password Setup* yang aman dan kadaluarsa secara otomatis.

---

## 2. Keputusan Arsitektur (Decision)

Disetujui untuk menerapkan **Alur Undangan Admin & Token Setup Password Mandiri**:

### A. Perubahan Prisma Schema (`User` Model)
Menambahkan 3 field baru pada model `User` di `prisma/schema.prisma`:
- `inviteToken`: Token acak unik berbasis crypto (`String? @unique`) untuk validasi tautan undangan.
- `inviteExpires`: Masa berlaku token undangan (`DateTime?`), diset selama **72 jam (3 hari)** sejak undangan dikirim.
- `isInvitePending`: Flag boolean (`Boolean @default(false)`) untuk menandai bahwa akun pengelola baru saja diundang dan belum menentukan password.

### B. Penyederhanaan Form "Tambah Admin Baru" (`/admin/users`)
- **Menghapus input `Password Awal`** dari modal `Tambah Admin Baru`.
- Input yang dibutuhkan hanya:
  1. **Nama Lengkap** (`name`)
  2. **Email Login** (`email`)
  3. **Role / Hak Akses** (`role`)
- Setelah formulir disubmit, sistem akan:
  1. Membuat record `User` baru dengan `isInvitePending: true` dan token `inviteToken`.
  2. Mengirimkan email undangan ke alamat email user baru berisi tautan penyiapan password (`https://[domain]/setup-password?token=[inviteToken]`).
  3. Menampilkan modal konfirmasi sukses di antarmuka Admin beserta tombol **"Salin Link Undangan" (Copy Invitation Link)** agar Super Admin dapat mengirim link secara manual via WhatsApp apabila diperlukan.

### C. Halaman Setup Password Publik (`/setup-password`)
- Halaman publik baru yang menerima query parameter `?token=...`.
- Memvalidasi status token (`inviteToken` ditemukan & `inviteExpires > now`).
- Menampilkan nama & email pengelola yang diundang.
- Menyediakan formulir penetapan password baru (`Password Baru` & `Konfirmasi Password`).
- Setelah disubmit:
  - Password di-hash menggunakan `bcryptjs` (salt 10 rounds).
  - Mengupdate `passwordHash`, menghapus `inviteToken` & `inviteExpires`, dan mengeset `isInvitePending: false` & `mustChangePassword: false`.
  - Mengarahkan user yang telah aktif ke halaman `/login`.

---

## 3. Konsekuensi & Dampak (Consequences)

### Positif:
- **Keamanan Lebih Tinggi**: Super Admin tidak lagi memegang atau mengetahui password awal pengelola.
- **Fleksibel & Nyaman**: Tautan undangan dapat dikirimkan otomatis via email maupun disalin langsung oleh Super Admin untuk dikirim via WhatsApp.
- **Sesuai EEOS Standard**: Memenuhi standar audit keamanan dan manajemen akun pengelola vtuabadi-dev.

### Antarmuka & API Terkait:
- `POST /api/admin/users`
- `GET /api/auth/setup-password`
- `POST /api/auth/setup-password`
- `src/app/admin/users/page.tsx`
- `src/app/setup-password/page.tsx`
