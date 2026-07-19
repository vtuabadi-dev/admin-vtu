# Navigation Architecture & UX Recommendation

## 1. Navigation Architecture
Struktur navigasi disederhanakan dengan tata letak menu utama berikut:

**Main Navigation (Sidebar/Top Menu)**
- **Master Data** (Menu Group Parent)
  - **Master Konfigurasi Paket** (Submenu)

*Menu Master lainnya akan mengisi slot di bawah `Master Data` pada sprint-sprint selanjutnya.*

## 2. Horizontal Tab Layout
Mengingat *Master Konfigurasi Paket* memuat 6 varian referensi, UX halaman tidak boleh berupa list yang panjang (*scroll-heavy*). Halaman akan dikelompokkan ke dalam 6 komponen **Tabs**:
1. Jenis Paket
2. Starting Point
3. Lama Perjalanan
4. Maskapai Internasional
5. Pola Landing
6. Kategori Perlengkapan

## 3. UX Components Recommendation
- **Data Table**: Setiap tab memuat tabel sederhana (Identifier, Nama Referensi, Status Badge, Kolom Aksi).
- **Status Lifecycle Toggle**: Implementasi pengubahan state lifecycle antara `Aktif` dan `Nonaktif` tidak disarankan menggunakan Modal Edit jika bisa diakomodasi. Sangat direkomendasikan menggunakan Switch/Toggle Component di setiap *row* tabel untuk kemudahan admin.
- **Form Actions**: Penggunaan *Slide-over Drawer* atau *Center Modal* ketika *Create* dan *Update* data.
- **Peniadaan Fungsi Hapus**: Sangat penting di level UI UX, seluruh elemen berlogo tempat sampah (Trash Icon) atau tombol "Hapus / Delete" ditiadakan dari UI Master Data sesuai dengan aturan Locked Business Rules.
