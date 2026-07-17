# Enterprise Activity Center - Dashboard Widget
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Modul *Dashboard* disusun oleh *Widget* individual yang dapat diatur ulang (Customizable Layout). Berikut adalah rincian fungsionalitas dari setiap *Widget* yang wajib ada di layar Command Center.

## 2. Widget Collection

### 1. Daily KPI Stats (Statistic)
Sederet kotak (cards) besar yang menunjukkan angka performansi mutlak pada hari berjalan (Reset tiap jam 00:00).
- **Total Activity:** Jumlah seluruh operasi.
- **Critical Activity:** Hitungan event berskala Critical/Emergency.
- **Automation / Job:** Rasio *Success vs Failed* pada eksekusi otomatis.
- **Authentication:** Percobaan *Login Failed*.
- **Integrations (Import/API):** Operasi data massal (*Import Success / Failed*).

### 2. Business Activity Heat Map
Matriks kalender (*Heat Map*) yang mewarnai tingkat kesibukan sistem.
- Sumbu X: Jam (00:00 - 23:59).
- Sumbu Y: Hari / Tanggal.
- Intensitas Warna: Menunjukkan kepadatan aktivitas. Sangat berguna untuk mengetahui kapan waktu tersibuk (*Peak Hour*) sehingga IT bisa melakukan proses sinkronisasi berat (Cron/Backup) di jam sepi (warna pucat).

### 3. Recent / Live Activity Feed
Mirip dengan konsep lini masa media sosial (Live Feed). Menampilkan **10 Aktivitas Terakhir** yang muncul satu per satu dengan transisi mulus ke bawah secara *realtime* (Auto Refresh). Widget ini memberi sensasi bahwa "sistem sedang berdetak dan hidup".

### 4. Top Issues & Anomalies List
Tabel ringkas yang memeringkat modul atau masalah paling bermasalah hari ini:
- **Top Error:** Error teknis yang paling sering muncul.
- **Top Critical:** Entitas bisnis yang menerima modifikasi tingkat bahaya tinggi (Misal: Penghapusan Invoice berjumlah masif).
- **Top Failed Automation:** Job sistem latar belakang yang terus menerus gagal.

### 5. Domain Activity Chart (Pie/Doughnut Chart)
Bagan visual porsi pembagian log berdasarkan Domain. (Contoh: 60% aktivitas di Order, 20% di Manifest, 10% di Master Data, dll).
