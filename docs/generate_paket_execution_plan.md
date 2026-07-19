# Execution Plan & Implementation Steps

## Sprint Recommendation

### Sprint 1: Core Foundation & UI Wizard
- **Fokus**: Menyiapkan struktur Database (Migrasi) untuk `paket_umroh` dan `paket_umroh_klaster`.
- **Backend**: Membuat API Aggregator/Composite untuk mengambil seluruh *Master Data (Aktif only)* dalam satu request untuk mengisi form. Membuat API `POST /generate` dengan kapabilitas *Bulk Insert* berbasis multiple dates.
- **Frontend**: Mengembangkan arsitektur UI berbasis **Stepper/Wizard** (4 Steps). Membangun logika reaktif auto-calculate untuk `Tanggal Kedatangan`.
- **Output**: Admin berhasil melakukan *Generate Paket* sampai tersimpan ke database secara utuh.

### Sprint 2: Data Consumption & Order Foundation
- **Fokus**: Menjadikan Paket Umroh bisa di-*query* dan ditampilkan sebagai Katalog di halaman internal.
- **Backend & Frontend**: Membangun relasi awal Modul *Order Jamaah* ke `paket_umroh_klaster` (transaksi standard tanpa override).

### Sprint 3: Advanced Business Rules (Hotel Override)
- **Fokus**: Menyelesaikan fitur *Override Hotel* pada level Order Jamaah.
- **Backend & Frontend**: Penyesuaian form Order Jamaah untuk fitur *Upgrade/Downgrade* Hotel beserta *recalculation* selisih harga akhir.
- **Data Engineering**: Membuat *View* atau *Query helper* khusus untuk pelaporan Manifest Hotel agar dapat membaca klausa prioritas (Override vs Default Klaster).

## Prioritas Eksekusi
Tahapan paling krusial ada di *Sprint 1 Backend (API /generate)*. Logika pengulangan (Looping) untuk insert *N Keberangkatan x M Klaster* harus dibangun dengan sangat rapi dan aman (Atomic Database Transaction).
