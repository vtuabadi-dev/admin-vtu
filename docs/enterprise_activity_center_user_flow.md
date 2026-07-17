# Enterprise Activity Center - User Flow
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Sistem tidak dapat hanya memiliki satu cara berinteraksi. Masing-masing peran (Role) pengguna di tingkat Manajemen/Enterprise memiliki pola investigasi (*User Flow*) yang berbeda sesuai dengan tanggung jawab mereka.

## 2. Role-Based Flow

### A. Owner / Board of Director
- **Fokus:** Kesehatan Bisnis, Deteksi Fraud Skala Besar, KPI Keseluruhan.
- **Flow:** Membuka Dashboard → Melihat *KPI Cards* → Meninjau *Top Issues* → Membuka Laporan *Export PDF* mingguan yang dikirim dari sistem. Owner nyaris tidak menyentuh filter detail.

### B. Auditor
- **Fokus:** Mencari anomali, pelacakan proses bisnis, investigasi kejanggalan uang.
- **Flow:** Membuka Activity Table → Menggunakan *Saved Filter* untuk mencari "Delete Action" pada Invoice → Menemukan anomali → Mencentang Event → Klik "Create Investigation" → Memonitor *Case Management*.

### C. Finance Manager
- **Fokus:** Pergerakan uang (In & Out), validasi Payment Gateway.
- **Flow:** Filter tabel ke Domain "Payment" & "Invoice" → Jika Payment Failed, klik "Correlation ID" → Masuk ke halaman *Timeline View* → Mencari tahu apakah Order dibatalkan sebelum Payment berhasil (Melihat Business Journey).

### D. IT Administrator
- **Fokus:** Error sistem, gagal integrasi, performa *Background Job*.
- **Flow:** Memantau *Live Activity Stream* di layar kedua → Memperhatikan warna merah (Error/Critical) → Jika *Failed Automation* meledak, langsung menggunakan fitur *Root Cause Explorer* untuk menemukan eksekusi awal yang gagal.

### E. Compliance Officer
- **Fokus:** Kepatuhan data, privasi (Passport), jejak akses keamanan (Security).
- **Flow:** Menggunakan filter Action "Login" & "Export" → Memastikan tidak ada pengunduhan (Export CSV) data Jamaah besar-besaran di jam 3 pagi (melihat *Heat Map*). Jika ada → Buat tiket *Investigation*.

### F. Operational Manager
- **Fokus:** Kelancaran keberangkatan, penyelesaian Manifest.
- **Flow:** Buka entity "Package" → Klik "View Journey" → Melihat apakah staf bawahannya sudah menyelesaikan penyusunan "Manifest" sesuai target waktu operasional.
