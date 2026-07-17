# Enterprise Activity Center - Navigation Policy
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Activity Center dalam VTU ABADI dirancang bukan sebagai "pusat data mati" (hanya sekadar *log file* teks), melainkan sebagai "pusat navigasi operasional interaktif". Konsep **Navigation Reference** (Referensi Navigasi) memungkinkan auditor atau manajemen untuk membaca suatu peristiwa dan, dalam satu klik, langsung melompat ke halaman sumber data tersebut untuk penyelidikan lebih lanjut.

## 2. Konsep Navigation Reference

Setiap kali modul mempublikasikan *Event*, sistem menyematkan metadata Navigasi berupa **Action Label** dan **URL/Path Reference**.

### Action Label (The "Call to Action")
Teks human-readable yang merujuk pada objek fungsional.
Contoh baku:
- `Open Package` (Menuju detail paket)
- `Open Order` (Menuju detail pemesanan jamaah)
- `Open Payment` (Menuju konfirmasi pembayaran)
- `Open Manifest` (Menuju struktur seating / bus manifest)
- `Open User` (Menuju manajemen profil staff)
- `Open Hotel` (Menuju detail kontrak master hotel)

### Extensibility & Dynamic Resolution
Rute URL (Path Reference) harus didefinisikan secara independen atau dikelola oleh UI *Router*.
- Contoh payload event dari backend: `url_path: "/order/detail/ORD-000123"`
- Saat diklik pada Activity Center UI, aplikasi akan mere-direksi pengguna menuju halaman spesifik tersebut.

## 3. Handling Data Permanence & Edge Cases

### The "Dead Link" Scenario (Deleted Entities)
Sifat Audit Log adalah *Immutable* dan menembus waktu. Namun, data operasional bisa saja dihapus (di-delete/di-archive) setelah event direkam.
- **Kasus:** User Budi menghapus data `Hotel ABC`. Activity Center merekam event penghapusan tersebut dengan referensi `Open Hotel`.
- **Kebijakan:** Sistem UI (*Frontend*) Activity Center harus melakukan pengecekan ketersediaan data. Jika Entity ID sudah tidak eksis atau event tersebut adalah operasi `Delete`, tombol referensi `Open Hotel` harus didisable (abu-abu/non-clickable) atau akan menampilkan *Notification/Tooltip*: "Data tidak lagi tersedia".
- *Alternative:* Mengarahkan klik pada rute data yang terhapus ke *Viewer Read-Only* lokal di dalam Activity Center sendiri yang merender snapshot dari field `old_value`.

Dengan pola Navigation Reference ini, penelusuran masalah (Troubleshooting), pengawasan kualitas (Quality Control), dan persetujuan operasional (Approval Flow) berjalan tanpa friksi perpindahan menu yang mengganggu.
