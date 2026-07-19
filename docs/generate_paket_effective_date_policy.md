# Generate Paket - Effective Date Policy
**Status:** DISCOVERY & BUSINESS RULE ONLY
**Target System:** VTU ABADI - ERP Core
**Architecture:** Clean Architecture, Framework Agnostic

## 1. Overview
Dokumen ini menetapkan regulasi transisi harga pada entitas Generate Paket menggunakan instrumen **Effective Date** (Tanggal Berlaku). Effective Date memungkinkan sistem merencanakan perubahan harga secara presisi pada dimensi waktu, menghindari kebingungan operasional saat cut-over konfigurasi harga.

## 2. Konsep Effective Date
**Effective Date** adalah parameter waktu (Date/Time) yang menentukan kapan sebuah *Harga Baru* (atau konfigurasi baru) mulai berlaku secara aktif dalam sistem dan digunakan untuk transaksi (Order) selanjutnya.

## 3. Business Rules

### Rule 3.1 - Forward-Looking Transitions
Harga Baru yang diinput oleh Admin pada Generate Paket akan memiliki kolom *Effective Date*. 
**Contoh Skenario:**
- Harga Lama (Active): Rp 31.500.000
- Harga Baru (Scheduled): Rp 32.500.000
- Effective Date: 20 Agustus 2026

### Rule 3.2 - Boundary Evaluation
Sistem mengevaluasi harga berdasarkan Timestamp (waktu pembuatan) sebuah Order:
1. **Order sebelum *Effective Date* (Tanggal 19 Agustus atau sebelumnya):** 
   Sistem mengacu pada *Harga Lama* dan membuat Snapshot dengan nilai Rp 31.500.000.
2. **Order tepat pada atau setelah *Effective Date* (Mulai 20 Agustus 00:00:00):**
   Sistem secara otomatis mengacu pada *Harga Baru* dan membuat Snapshot dengan nilai Rp 32.500.000.

### Rule 3.3 - Automatic Switchover
Proses peralihan status harga tidak memerlukan intervensi manual (Admin tidak perlu klik "Aktifkan Harga Baru" tepat di tengah malam pada tanggal 20). Engine Backend / Middleware bertugas memastikan resolver harga memvalidasi *Effective Date* sebelum menyajikan *Active Price* kepada end-user atau modul Order.

## 4. Future Extensibility
Konsep *Effective Date* secara arsitektural dikonstruksi agar *Framework Agnostic*. Pattern *Time-Based Configuration* ini di masa depan dapat diperluas untuk:
- *Seasonal Promos* (Effective Start Date & End Date)
- Pergantian *Vendor Hotel* di tengah musim
- Perubahan Pajak / Kurs Acuan berkala
Sistem diwajibkan mendukung query konfigurasi berdasarkan *Point In Time*.
