# Enterprise Activity Center - Timeline
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
**Timeline View** adalah fitur revolusioner dalam Enterprise Activity Center. Ini membebaskan pengguna dari kebingungan membaca tabel data tabular yang kaku dengan memvisualisasikan rentetan event sebagai sebuah cerita (Business Journey).

## 2. Business Journey Visualization
Sistem memvisualisasikan siklus hidup (Lifecycle) jamaah/transaksi melalui alur kronologis (Timeline).
**Contoh Alur Baku:**
`Generate Paket` → `Order` → `Invoice` → `Payment` → `Manifest` → `Rooming` → `Visa` → `Departure` → `Return`

Setiap *node* pada timeline di atas mewakili interaksi state dalam modul tersebut, lengkap dengan stempel waktu (Timestamp) dan Aktor pelaksana.

## 3. Correlation ID Page (Detail View)
Ketika pengguna mengklik sebuah **Correlation ID**, sistem akan merender halaman *Dedicated Correlation Page*. 
Pada halaman ini, pengguna dapat melihat:
- **Business Journey:** Representasi visual sejauh mana proses transaksi telah berjalan.
- **Event Timeline:** Urutan kejadian detik demi detik yang saling berkaitan.
- **Affected Module:** Daftar modul apa saja yang tersentuh oleh Correlation ID tersebut (Misal: Modul Keuangan dan Modul Paspor).
- **Affected Entity:** Daftar spesifik identitas data yang terpengaruh (Misal: ORD-011, INV-011, Paspor A/n Budi).
- **Root Cause / Trigger:** Kejadian pionir (urutan #1) yang memicu domino event selanjutnya.

## 4. Entity Journey
Setiap *Entity* (Objek Bisnis) memiliki pintasan "View Journey" di panel navigasinya masing-masing.
- **View Package Journey:** Melacak siapa saja yang mengubah harga dan kapan paket tersebut dipublikasi.
- **View Order Journey:** Melacak kapan diorder, kapan dibayar, dan oleh siapa.
- **View Passport Journey:** Menelusuri histori dari paspor diunggah, diverifikasi, hingga divalidasi ke sistem kedutaan.
