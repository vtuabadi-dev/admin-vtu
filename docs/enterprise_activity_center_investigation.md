# Enterprise Activity Center - Investigation
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Activity Center harus proaktif membantu pengungkapan kasus (Fraud, Error, atau Anomali). Oleh karena itu, antarmuka menyediakan serangkaian fitur *Case Management* & *Root Cause Analysis* khusus untuk peran Auditor dan IT.

## 2. Investigation Mode & Case Management
Apabila Auditor menemukan kumpulan transaksi/event yang mencurigakan, mereka dapat memblokir/memilih (checkbox) beberapa event tersebut dan mengklik opsi **"Create Investigation"**.

Aksi ini akan menghasilkan dokumen Investigasi internal (*Case Management*) dengan atribut:
- **Title:** Judul kasus (Misal: "Dugaan Manipulasi Harga Paket VIP").
- **Description:** Narasi dari temuan awal auditor.
- **Priority:** Low, Medium, High, Critical.
- **Status:** Open, In Progress, Resolved, Closed.
- **Assignee:** PIC yang ditugaskan untuk meneliti masalah (Misal: Manager IT atau Manager Keuangan).
- **Conclusion:** Hasil akhir setelah investigasi selesai.

Ini menghubungkan data mentah (*log*) dengan alur penyelesaian masalah (*Resolution Workflow*).

## 3. Root Cause Explorer
Sistem akan dilengkapi fitur pelacakan *Root Cause* otomatis. Jika sebuah event menghasilkan tumpukan error beruntun (Cascading Error), *Root Cause Explorer* akan melacak rentetan *Correlation ID* atau *Timestamp* mundur hingga menemukan **Event Pemicu Awal** (First Triggering Event). 
Contoh: Pembayaran Gagal secara masal ternyata dipicu oleh event `System Timeout` pada modul Webhook 3 menit sebelumnya.

## 4. Export Investigation
Laporan kasus atau deretan aktivitas log wajib dapat diekspor untuk bahan pelaporan eksternal atau Rapat Direksi.
- **PDF:** Laporan ringkas, rapi, dengan layout yang ramah cetak (termasuk grafik timeline).
- **Excel:** Ekspor matriks data lengkap (termasuk kolom *old_value* dan *new_value*) untuk diolah rumusnya oleh Auditor/Finance.
- **JSON:** Raw payload untuk integrasi atau analisa forensik oleh aplikasi eksternal/IT.
