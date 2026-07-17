# Enterprise Activity Center - UX & Interaction
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Dokumen ini menetapkan standar User Experience (UX), interaksi, dan aksesibilitas untuk Activity Center. Activity Center wajib menjadi alat yang ergonomis bagi pekerja data yang memonitor ribuan baris log setiap hari.

## 2. Enterprise Table Views
Activity Table tidak statis. Sistem memberikan kontrol *density* (kepadatan) kepada user:
- **Compact View:** Menampilkan baris yang sangat padat. Cocok untuk IT Administrator yang mencari pola log secara cepat di layar besar.
- **Comfortable View:** Tampilan lega dengan *white-space* yang cukup, cocok untuk membaca `detail.description` tanpa terpotong.
- **Timeline View:** Mengubah baris tabel menjadi urutan garis waktu vertikal (chronological timeline) untuk membaca kronologi perjalanan bisnis.

## 3. Workspace Features

### Saved Filter
Mengingat kompleksitas kombinasi pencarian, sistem memfasilitasi "Saved Filter".
- *Contoh bawaan:* `Critical Today`, `Payment Issue`, `Visa Activity`, `Finance Activity`, `Automation Failed`.
- User dibebaskan meracik dan menyimpan set filter personal mereka sendiri.

### Bookmark
Untuk event-event yang memerlukan penanganan terpisah atau referensi di lain hari, user dapat mengklik ikon "Bintang / Pita" untuk menyimpannya ke dalam daftar *Bookmark* pribadi.

### Notification Center
Terintegrasi pada top-bar aplikasi. Jika ada event berskala **Critical** atau **Emergency** (Misal: Database drop, Mass Delete, atau Mass Login Failed), sistem memunculkan notifikasi *Toast / Pop-up* seketika itu juga tanpa perlu me-*refresh* halaman.

## 4. Environment & Accessibility
- **Dark Mode Friendly:** Wajib didukung untuk mengurangi mata lelah bagi IT atau Auditor yang bekerja di malam hari atau menatap layar berjam-jam.
- **Keyboard Navigation:** Mendukung *shortcut* keyboard (`Arrow Keys` untuk navigasi baris, `Enter` untuk membuka detail, `/` untuk fokus ke kolom *Search*).
- **Responsive Design:** 
  - *Desktop Optimized:* Resolusi luas untuk tabel jutaan data.
  - *Tablet Friendly:* Navigasi sentuh untuk operasional manajerial on-the-go.
  - *Mobile Friendly:* Tampilan diringkas menjadi mode *Card/Timeline* untuk Owner yang memantau via ponsel.
