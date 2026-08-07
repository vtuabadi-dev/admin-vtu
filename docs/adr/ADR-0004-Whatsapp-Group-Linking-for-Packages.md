# ADR-0004: WhatsApp Group Linking for Packages

## Status
PROPOSED

## Tanggal
2026-08-07

## Konteks
Operasional ma'had/travel sering kali mengelola komunikasi per paket keberangkatan melalui grup WhatsApp khusus (misalnya, grup koordinasi jamaah).
Saat ini, admin harus membuka WhatsApp secara manual, mencari grup yang tepat, menyalin teks laporan kolektif dari aplikasi, dan menempelkannya (*paste*) secara manual.

Untuk memudahkan alur kerja ini, sistem memerlukan fitur penautan paket keberangkatan dengan grup WhatsApp secara langsung di panel admin (Opsi A - Semi-Otomatis).

## Keputusan
Menambahkan kolom baru pada skema database untuk menyimpan tautan undangan grup WhatsApp:

### A. Modifikasi Model `Keberangkatan` di `prisma/schema.prisma`
Tambahkan kolom baru:
- `whatsappGroupUrl String?` — Menyimpan tautan undangan grup WhatsApp yang valid (contoh: `https://chat.whatsapp.com/L1M2N3O4P5...`).

### B. Alur UI dan Integrasi
1. **Penyimpanan Tautan**:
   - Di halaman Laporan Kolektif Paket, jika paket dipilih, admin dapat melihat kolom input untuk menyimpan/mengubah tautan grup WhatsApp.
   - Perubahan ini akan memicu panggilan API untuk memperbarui kolom `whatsappGroupUrl` di tabel `Keberangkatan`.
   - Jika paket merupakan bagian dari **Laporan Konsolidasi Gabungan** (berbagi `paketGrupId`), penyimpanan tautan akan otomatis memperbarui kolom `whatsappGroupUrl` untuk seluruh paket yang berada di kelompok yang sama agar tetap sinkron.

2. **Pengiriman Laporan**:
   - Di modal Template WhatsApp, selain tombol "Salin Teks" dan "Buka WhatsApp Desktop", ditambahkan tombol utama **"Kirim ke Grup WA"**.
   - Tombol ini akan otomatis menyalin teks ke *clipboard* lalu mengarahkan browser ke tautan grup WhatsApp (`whatsappGroupUrl`) yang telah ditautkan.
   - Admin hanya perlu menempelkan (*paste* / Ctrl+V) laporan di grup tersebut.

## Konsekuensi
- **Positif**:
  - Alur pengiriman laporan menjadi jauh lebih cepat dan terarah langsung ke grup koordinasi masing-masing paket.
  - Bebas biaya langganan gateway dan aman dari risiko blokir WhatsApp karena menggunakan tautan resmi WhatsApp Web/App.
  - Data tautan grup terpusat sehingga semua admin operasional memiliki akses ke grup yang sama.
- **Negatif**:
  - Memerlukan migrasi database untuk menambahkan kolom baru (`whatsappGroupUrl`) pada model `Keberangkatan`.
