# Enterprise Command Palette
**Status:** DISCOVERY & BUSINESS ARCHITECTURE ONLY
**Target System:** VTU ABADI - Enterprise Travel Management System

## 1. Konsep & Visibilitas (Ctrl + K / Cmd + K)
Command Palette adalah jalan pintas universal (*Omnibar*) yang dipanggil dari seluruh layar aplikasi. Palet ini menyatukan Pencarian, Navigasi, dan Eksekusi (Action) dalam satu kolom input.

## 2. Jenis Command & Output Interaktif

- **Search Command:** "Manifest Ahmad"
  *Output:* Menampilkan List "Ahmad" di dalam tabel manifest berbagai tanggal keberangkatan.
- **Navigation Command:** "ORD-000123"
  *Output:* Pintasan navigasi instan:
  → Open Order ORD-000123
  → Open Invoice ORD-000123
  → View Business Journey
- **Action Command:** "Payment Failed"
  *Output:* Mencari anomali, memfilter *Activity Center*, lalu menyodorkan opsi:
  → View Failed Events
  → Retry Eligible Payments (Jika Otorisasi terpenuhi)

## 3. Command Security (RBAC Compliance)
Command Palette tunduk mutlak pada RBAC sistem.
- *Blind Search:* Jika Staff Marketing mengetik "Finance Report", opsi tersebut **TIDAK AKAN MUNCUL** pada hasil *palette*, mengamankan informasi dari eksplorasi sembarangan.
- *Guarded Action:* Jika eksekusi aksi (Misal: "Lock User Budi") diakses via *Command Palette*, aplikasi tetap akan memanggil Pop-up Konfirmasi (*Confirmation Modal*) standar dan menolak bypass keamanan. Tidak ada "Direct Execution" terselubung untuk operasi berisiko tinggi.
