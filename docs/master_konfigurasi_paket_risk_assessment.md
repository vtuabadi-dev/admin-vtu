# Risk Assessment

## 1. Historical Transaction Corruption Risk (MITIGATED)
- **Risiko Inheren**: Ketika sebuah parameter bisnis lama (contoh: Paket Plus Dubai) dihapus oleh Admin, semua transaksi pembayaran atau jadwal pendaftaran jamaah masa lalu yang mengikat paket tersebut akan me-*render* data yang kosong/error karena ID rujukannya (*foreign key*) hilang secara fisik di database.
- **Strategi Mitigasi Terkunci (PO Decision)**: Melarang seluruh fungsionalitas `Hard Delete`. Siklus visibilitas dikontrol mutlak melalui status `Aktif` / `Nonaktif` sesuai dengan dokumen *Master Data Business Rules*. Seluruh *query reporting* wajib mematuhi skema referensi ini. 

## 2. Hardcoded Logic Stagnation Risk
- **Risiko Inheren**: Jika aturan *Business Journey Pattern* (Pola Landing: JED.C-M, UD.D-J, dll) ditulis keras di level source code (Enumeration), perusahaan harus merilis ulang (*redeployment*) sistem setiap kali ada pola operasional pesawat terbaru.
- **Strategi Mitigasi**: Pola Landing sepenuhnya diangkat menjadi *Master Data*. Admin memiliki kewenangan langsung untuk menambahkan skenario / kategori pola landing baru (seperti "Tour Dahulu") dari UI tanpa campur tangan Programmer.

## 3. Form Component Retrieval Overload Risk
- **Risiko Inheren**: Sebuah form yang memuat 6 elemen dropdown berbeda (Jenis, Starting Point, Lama Hari, Maskapai, Pola, Kategori Barang) berpotensi meluncurkan 6 HTTP request konkuren yang berat (*N+1 issue pattern* secara logikal).
- **Strategi Mitigasi**: Implementasi arsitektur API agregasi (*Composite Endpoint* untuk dropdown master) atau memanfaatkan state caching sisi frontend (SWR / React Query) agar *network load* menuju database menjadi sangat efisien.
