# Enterprise Activity Center - Dashboard
**Status:** DISCOVERY & UX ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Overview
Dashboard pada Enterprise Activity Center adalah **Landing Page** utama dan dirancang sebagai sebuah **Enterprise Command Center**, bukan sekadar halaman tabel log konvensional. Tujuannya adalah memberikan sekilas pandang (*Bird's-Eye View*) mengenai denyut nadi operasional sistem secara *real-time*.

## 2. Dashboard Layout & Structure
Dashboard dirancang secara modular dan *widget-based*.

### Top Section: KPI Cards (Key Performance Indicators)
Baris paling atas berisi matriks kinerja aktivitas harian:
- **Total Activity:** Jumlah semua event hari ini.
- **Critical & Warning Today:** Jumlah insiden peringatan dan kritis.
- **Automation Status:** Automation Success vs Automation Failed.
- **Security Alerts:** Login Failed.
- **Financial Status:** Payment Success vs Payment Failed.
- **Data Ops:** Import Success vs Import Failed.

### Middle Section: Activity Visualizations
- **Business Heat Map:** Grafik yang menunjukkan kepadatan aktivitas berdasarkan waktu (Jam & Hari) dan Domain yang paling sibuk.
- **Top Issues / Anomalies:** Menyoroti masalah utama secara instan tanpa perlu mencari secara manual.

### Side/Bottom Section: Live Monitoring
- **Recent Activity Feed:** Tampilan *real-time* aliran data 10 aktivitas terakhir yang terus diperbarui (Auto-refresh).

## 3. Core Philosophy
> **"Information at a glance, investigation in a click."**
Dengan struktur ini, User level Manajemen (seperti Owner atau Manager) tidak perlu berhadapan langsung dengan jutaan baris tabel log. Mereka disambut dengan agregasi visual yang memberikan indikasi kesehatan sistem (System Health & Business Health).
