# Enterprise Activity Center - Security Policy
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Activity Center mencatat seluk-beluk terdalam dari aktivitas operasional, keuangan, dan data pribadi (Jamaah). Oleh karenanya, informasi yang bersemayam di dalamnya terkategori sangat sensitif (Highly Sensitive). Dokumen ini menggariskan proteksi privasi, retensi, keamanan, dan visibilitas data Audit Log di dalam sistem VTU ABADI.

## 2. Hak Akses, Role & Visibility

### Restricted Access by Default
Modul Activity Center **TIDAK BOLEH** dapat diakses secara *default* oleh user operasional standar (seperti CS, Admin Paket, atau Staff Finance biasa).
- Fitur ini eksklusif untuk level manajerial tinggi: `Super Admin`, `System Administrator`, `Compliance/Audit Officer`, dan `Top Management`.
- Halaman UI Activity Center diproteksi oleh lapisan validasi hak akses ketat (Strict Role Based Access Control / RBAC).

### Granular Visibility (Future Architecture)
Untuk kebutuhan operasional berskala sangat besar, sistem kelak harus mampu mendukung visibilitas terkotak (*compartmentalization*).
- Manajer Departemen `Visa` hanya diizinkan mem-filter dan membaca event yang domainnya adalah `Visa`.
- Level `Super Admin` dapat melihat keseluruhan spektrum event sistem.

## 3. Data Sensitivity & Masking
Karena standar event menangkap `old_value` dan `new_value`, data sensitif (PII - Personally Identifiable Information atau Data Finansial Konfidensial) terancam terekspos ke tim IT/Admin:
- Password, Secret Keys, dan API Token dari tabel manapun **DILARANG KERAS** disimpan mentah ke dalam Activity Center. Data ini wajib di-masking/diredact (misal: `"password": "***REDACTED***"`).
- Nomor Kartu Kredit (jika ada) harus di-mask.

## 4. Immutability & Anti-Tampering (Compliance)
- **Zero-Modification Policy:** Arsitektur database atau API untuk Activity Center tidak boleh mengekspos endpoint *Update* (PUT/PATCH) ataupun *Delete* (DELETE).
- Apabila terjadi penyusupan (Security Breach) pada aplikasi utama, pelaku tidak boleh dapat memanipulasi riwayat forensiknya di Activity Center. Idealnya *database log* dipisahkan secara fisik/kredensial dari *database* operasional.

## 5. Retention & Archiving
Aktivitas sistem berskala ERP menghasilkan pertumbuhan data *(data growth)* eksponensial.
- **Active Data Retention:** 1 s/d 2 Tahun (Tersedia langsung dan cepat dicari di UI Activity Center).
- **Cold Archiving:** Data di atas 2 Tahun otomatis dipindahkan ke media penyimpanan murah (Cloud Storage CSV/Parquet Backup) untuk keperluan audit hukum. Tidak tampil secara realtime di UI.
