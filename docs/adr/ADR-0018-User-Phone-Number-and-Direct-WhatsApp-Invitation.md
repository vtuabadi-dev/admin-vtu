# ADR-0018: Penambahan Nomor WhatsApp/Telepon User & Pengiriman Undangan WhatsApp Langsung

## Status
APPROVED (Product Owner & Architecture Review)

## Tanggal
2026-09-08

## Domain
Authentication, User Management, Notification & Communication Gateway

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks (Context)
Pada alur pengelolaan user (`/admin/users`), Super Admin dapat mengundang calon pengelola sistem dan membagikan tautan aktivasi akun melalui WhatsApp dengan tombol **"Kirim WA"**.

Sebelumnya, URL pengiriman WhatsApp dibentuk menggunakan format umum:
`https://api.whatsapp.com/send?text=[pesan]` tanpa menyertakan nomor tujuan (`phone`).
Hal ini menyebabkan peramban membuka jendela kontak pencarian (*Share on WhatsApp* / Pilih Kontak) alih-alih langsung membuka ruang obrolan privat dengan calon admin yang bersangkutan. Selain itu, model `User` belum memiliki atribut untuk menyimpan nomor telepon/WhatsApp.

---

## 2. Keputusan Arsitektur (Decision)

1. **Perubahan Skema Database (`prisma/schema.prisma`)**:
   - Menambahkan kolom `phone String?` pada model `User`.
   - Kolom bersifat opsional (*nullable*) untuk menjamin *backward compatibility* terhadap user yang sudah ada sebelumnya.

2. **Perubahan API Endpoint**:
   - `GET /api/admin/users`: Menyertakan kolom `phone` dalam payload data user.
   - `POST /api/admin/users`: Menerima input `phone` opsional saat registrasi admin baru.
   - `PATCH /api/admin/users/[id]`: Memungkinkan pembaruan nomor telepon `phone` untuk user yang sudah terdaftar.
   - `POST /api/admin/users/[id]/resend-invite`: Mengembalikan informasi `phone` pada payload respons.

3. **Format & Normalisasi Nomor WhatsApp**:
   - Sistem melakukan sanitasi dan normalisasi otomatis:
     - Nomor berawalan `08...` diubah menjadi format internasional `628...`.
     - Nomor berawalan `+628...` dibersihkan menjadi `628...`.
     - Nomor yang hanya diawali `8...` otomatis ditambahkan prefiks `628...`.
   - URL WhatsApp dibentuk secara presisi:
     `https://api.whatsapp.com/send?phone=[628xxx]&text=[pesan_undangan]`

4. **Pengalaman Pengguna (UX) di Halaman `/admin/users`**:
   - Modal **Tambah Admin Baru** menyediakan input nomor telepon / WhatsApp.
   - Modal **Edit Pengelola** menyediakan kemampuan mengubah nomor telepon / WhatsApp.
   - Jika admin yang telah terdaftar belum memiliki nomor telepon saat tombol **"Kirim WA"** diklik, sistem menyediakan dialog interaktif cepat untuk memasukkan nomor, menyimpannya ke database, dan langsung membuka chat WhatsApp ke nomor tersebut.

---

## 3. Konsekuensi (Consequences)
- Super Admin dapat mengirim undangan aktivasi dalam 1 klik langsung ke nomor WhatsApp calon admin tanpa harus mencari kontak secara manual di WhatsApp.
- Skema database tetap aman dan kompatibel dengan versi sebelumnya (*zero-downtime, non-destructive migration*).
- Memenuhi tata kelola **EEOS Baseline v1.2** terkait perubahan skema data dan integrasi komunikasi.
