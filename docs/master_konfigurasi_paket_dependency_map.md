# Dependency Mapping

Dokumen ini memetakan dampak arsitektural akibat implementasi "Master Konfigurasi Paket".

## 1. Outbound Dependencies (Sistem Bergantung ke Konfigurasi Paket)
Sistem ini diposisikan sebagai *Single Source of Truth*. Modul yang sangat bergantung pada eksistensi fitur ini:
- **Modul Pembuatan / Form Paket Umroh Baru**: Dilarang meletakkan opsi *hardcode* di dalam kode komponen React/Vue. Semua opsi (Jenis, Maskapai, Starting Point, Lama Perjalanan, Pola Landing) wajib memanggil (fetch API) dari tabel Master dengan parameter filter (*Aktif only*).
- **Report Generator / Analytical Dashboard**: Seluruh *query reporting* performa bisnis (misal: "Tren paket umroh berdurasi 9 Hari") akan bergantung pada konsistensi referensi ID historis yang ditarik dari Master Data. Karena Master Data menolak *Hard Delete*, *report generation* dijamin bebas dari error *record not found*.

## 2. Inbound Dependencies
Fungsionalitas yang diperlukan Master Data dari komponen infrastruktur lain:
- **Authentication & RBAC**: Fitur CRUD dan perubahan *lifecycle Aktif/Nonaktif* di modul ini WAJIB dibatasi (restricted) khusus *Super Admin* atau peran pengelola *Product* demi keamanan konfigurasi pusat.
