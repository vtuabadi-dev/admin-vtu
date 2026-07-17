# Enterprise Resolution & Action UX
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. UX Principle: Progressive Disclosure
Activity Center wajib mempertahankan estetika *Clean UI*. Daripada menampilkan semua log, tombol aksi, dan form analisis sekaligus, UI memuat informasi secara bertingkat saat Event Detail dibuka (Klik pada tabel).

## 2. Struktur Event Detail Panel (Right Sidebar / Modal)

1. **EVENT DETAIL (The Facts)**
   - *What Happened:* "Payment Failed"
   - *Who:* "System"
   - *When:* "2026-08-20 10:15 UTC"
   - *Where / Source:* "Xendit Webhook"
   - *Severity:* "Warning"

2. **RELATED CONTEXT (The Breadcrumbs)**
   - *Entity:* Link ke tabel Order.
   - *Correlation ID:* "CID-889900" (Bisa diklik untuk melihat seluruh *Business Journey*).

3. **RECOMMENDED ACTION (The Assistant)**
   - Menampilkan deretan aksi dinamis (Suggested Actions):
     - `[Icon] Retry Payment Transaction` (Tombol Aksi).
     - `[Icon] Contact Customer` (Tombol Navigasi Email/WhatsApp).

4. **INVESTIGATION (The Deep Dive)**
   - Form ringkas: `[+ Create Investigation]`
   - Jika sudah ada: Menampilkan status investigasi (PIC, Status).

5. **RESOLUTION (The Closure)**
   - Kolom riwayat resolusi masalah: *Action Taken* (Apa yang sudah ditekan di atas), *Result*, dan ceklis *Verification*.

Struktur visual vertikal ini memandu mata pengguna dari "Membaca Fakta" menuju "Mempertimbangkan Konteks", lalu "Mengeksekusi Solusi", dan akhirnya "Mengunci Resolusi".
