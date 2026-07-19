# Generate Paket - Audit Log Policy
**Status:** DISCOVERY & BUSINESS RULE ONLY
**Target System:** VTU ABADI - ERP Core
**Architecture:** Clean Architecture, Framework Agnostic

## 1. Overview
Dokumen ini merupakan panduan implementasi Audit Log untuk melacak segala bentuk mutasi (*In-Place Update*) pada konfigurasi master, khususnya harga Generate Paket Umroh. Sesuai *Price Policy*, Audit Log bertindak sebagai sumber kebenaran (*Source of Truth*) atas riwayat perubahan tanpa membebani antarmuka pengguna utama.

## 2. Business Rules

### Rule 2.1 - Internal & Non-Intrusive Design
Audit Log bersifat **Internal**. Log ini **TIDAK BOLEH** dimunculkan, dirender, atau diekspos di panel utama "Generate Paket" (seperti tabel riwayat di UI Generate Paket). 

### Rule 2.2 - Privilege Access Control
Audit Log ditempatkan dalam modul Sistem / Keamanan terpisah. Hanya User dengan Role atau *Permissions* tingkat manajerial khusus (misal: System Admin, Compliance Officer, Finance Manager) yang diizinkan mengakses log mutasi data konfigurasional.

### Rule 2.3 - Mandatory Data Structure
Untuk menjamin tingkat akuntabilitas level *Enterprise*, Audit Log WAJIB menangkap field minimal sebagai berikut:
- **Tanggal** (Date of action)
- **Jam** (Timestamp with timezone)
- **User** (Identifier user yang melakukan perubahan)
- **Field yang berubah** (Nama atribut/kolom, misal: `base_price`)
- **Nilai Lama** (Previous state, misal: `31500000`)
- **Nilai Baru** (Current state, misal: `32500000`)
- **Reason** *(Optional)* (Keterangan/Justifikasi perubahan dari form UI jika ada)
- **Entity** (Nama entitas tabel/domain, misal: `Package`)
- **Entity ID** (Primary Key entitas terkait)

## 3. Best Practices & Retention
- **Immutability:** Data pada Audit Log dirancang *Append-Only* (Write-Only). Tidak ada proses Update / Delete pada data log.
- **Asynchronous Execution:** Penulisan log harus dilakukan secara *Asynchronous* melalui event bus/message broker agar tidak memperlambat waktu respon utama dari update *Generate Paket*.
- **Retention Policy:** Log mutasi harga memiliki urgensi finansial yang krusial. Data ini harus memiliki masa simpan (retensi) jangka panjang yang selaras dengan undang-undang pencatatan perpajakan & audit keuangan, minimum *cold storage* archiving jika telah melampaui 1 tahun aktif.
