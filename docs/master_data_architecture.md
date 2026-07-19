# Master Data Architecture

## 1. Business Domain Analysis
Berdasarkan keputusan final Product Owner, Master Data di VTU ABADI secara eksklusif diposisikan sebagai **Configuration Center** dan **Single Source of Truth** untuk seluruh sistem. 

Master Data **BUKAN** data transaksi. Fungsinya hanya mengelola konfigurasi dan data referensi (*reference data*). Seluruh transaksi operasional dalam sistem akan mengambil referensi secara terpusat dari Master Data ini.

## 2. Configuration Center Architecture
Arsitektur Configuration Center mengedepankan prinsip:
- **Centralized Reference**: Single Source of Truth untuk semua dropdown dan parameter sistem.
- **Decoupled**: Terpisah dari entitas transaksi. Entitas transaksi hanya menyimpan ID (Foreign Key) dari referensi Master Data.
- **Extensible**: Penambahan kategori master baru dapat dilakukan tanpa mengubah arsitektur inti.

## 3. Master Data Governance (LOCKED)
Terdapat *Engineering Governance* yang dikunci secara arsitektural untuk seluruh Master Data:
- **DILARANG HARD DELETE**: Seluruh entitas Master Data tidak boleh dihapus secara fisik atau permanen dari database.
- **Aksi yang Diperbolehkan**: Hanya `Create`, `Update`, set `Aktif`, dan set `Nonaktif`.
- **Data Historis Utuh**: Histori transaksi masa lalu wajib tetap dapat membaca nama/label Master Data dengan baik meskipun status master data tersebut saat ini sudah `Nonaktif`.

## 4. Master Data Menu Structure
Saat ini struktur navigasi yang disepakati untuk fase awal ini hanya meliputi satu hierarki:
- **Master Data**
  └── **Master Konfigurasi Paket**

Submenu lain (seperti Master Hotel, Master Dokumen, Master Vendor) tidak akan disertakan pada sprint ini dan diposisikan untuk pengembangan pada sprint berikutnya.
