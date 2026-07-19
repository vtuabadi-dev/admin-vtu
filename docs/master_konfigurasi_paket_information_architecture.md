# Information Architecture & Entity Relationship

## 1. Information Architecture
Rancangan fundamental untuk tipe field masing-masing kategori Master Konfigurasi Paket. Sesuai dengan Business Rules, setiap entitas WAJIB memiliki status Aktif/Nonaktif.

### A. Jenis Paket
- `nama` (String, Mandatory)
- `status_aktif` (Boolean, Mandatory, Default: true)

### B. Starting Point
- `nama_kota` (String, Mandatory)
- `status_aktif` (Boolean, Mandatory, Default: true)

### C. Lama Perjalanan
- `label_hari` (String, Mandatory)
- `status_aktif` (Boolean, Mandatory, Default: true)

### D. Maskapai Internasional
- `kode_maskapai` (String, Mandatory, Unique Index)
- `nama_maskapai` (String, Mandatory)
- `status_aktif` (Boolean, Mandatory, Default: true)

### E. Pola Landing (Business Journey Pattern)
- `kode_pola` (String, Mandatory, Unique Index)
- `status_aktif` (Boolean, Mandatory, Default: true)

### F. Kategori Perlengkapan
- `nama_kategori` (String, Mandatory)
- `status_aktif` (Boolean, Mandatory, Default: true)

## 2. Entity Relationship Recommendation (Logical)
- Setiap kategori di atas direkomendasikan menjadi tabel database yang terpisah dikarenakan adanya constraint unik (misal: Maskapai membutuhkan `kode_maskapai` Unique Constraint).
- **Integritas Relasional:** Dikarenakan adanya Master Data Governance (LOCKED) yang melarang *Hard Delete*, seluruh Foreign Key (`id` dari Master Data) yang terhubung dengan tabel transaksional (seperti tabel Paket) harus dideklarasikan secara konvensional (menggunakan referensi normal). Tidak diperbolehkan memakai constraint `ON DELETE CASCADE`.
