# Master Configuration Implementation Risk
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Risk Assessment & Mitigation

### Risk 1: Circular Dependency & Broken References
- **Skenario:** Developer secara tak sengaja mendesain `Klaster` bergantung pada `Paket` dan `Paket` bergantung pada `Klaster`. Atau Master Data dihapus keras (Hard Delete) padahal Paket masih memakainya.
- **Mitigasi:** Konfigurasi Prisma/Database diset `ON DELETE RESTRICT`. Blokir tombol Delete di frontend jika referensi > 0. Tegakkan alur agregasi 1 arah.

### Risk 2: Snapshot Failure (Financial Risk)
- **Skenario:** Proses transaksi (Order) gagal meng-copy *Snapshot Harga*, melainkan hanya menyimpan Foreign Key ke Master Harga. Saat Harga berubah, nilai invoice puluhan Jamaah ikut berubah mendadak.
- **Mitigasi:** Arsitektur *Order Service* wajib dirancang mandiri dengan *Schema Order* yang mereplikasi kolom *Harga_Base* dan *Nama_Paket*. Audit Test ketat: Ubah Master, pastikan *Order* lama bernilai stagnan.

### Risk 3: Activity Event Tidak Sinkron (Silent Error)
- **Skenario:** API berhasil meng-update Master Data, namun modul pencatatan (Activity Logger) gagal mencatat ke dalam EAC karena *Network Timeout*, menyebabkan hilangnya *Audit Trail*.
- **Mitigasi:** Implementasi pola *Outbox Pattern* atau penyisipan sinkron (Dalam 1 DB Transaction) jika sistem *Message Queue* asinkron belum terpasang. Menjamin konsistensi absolut antara Modifikasi Data dan Log Event.

### Risk 4: UI Complexity Explosion (Generate Paket)
- **Skenario:** Ratusan kombinasi field membuat form (React/Vue) lambat dan membuat browser admin *freeze*.
- **Mitigasi:** Menerapkan arsitektur UI *Wizard* (Step-by-step 1 s/d 5) dan metode *Lazy Loading* pada data *dropdown*.
