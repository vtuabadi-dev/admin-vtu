# Generate Paket - Price Policy
**Status:** DISCOVERY & BUSINESS RULE ONLY
**Target System:** VTU ABADI - ERP Core
**Architecture:** Clean Architecture, Framework Agnostic

## 1. Overview
Dokumen ini mendefinisikan kebijakan pengelolaan harga pada modul **Generate Paket Umroh**. Harga paket umroh di dalam sistem VTU ABADI bersifat sangat dinamis dan dipengaruhi oleh faktor eksternal dan internal seperti:
- Fluktuasi Kurs Mata Uang (Dollar/Riyal)
- Perubahan Harga Hotel
- Fluktuasi Harga Tiket Penerbangan
- Kebijakan Makapai & Travel
- Promosi

Untuk mengelola dinamika tersebut dengan aman tanpa mengorbankan performa maupun *user experience*, sistem menerapkan kebijakan Harga Aktif (*Active Price*).

## 2. Business Rules

### Rule 2.1 - Single Source of Active Price (Harga Aktif)
Pada UI / Panel utama Generate Paket Umroh, sistem HANYA akan menampilkan **"Harga Aktif"**. Harga aktif adalah satu-satunya acuan harga yang berlaku untuk operasional paket saat ini.

### Rule 2.2 - Clean User Interface
User / Admin yang mengakses UI Generate Paket **TIDAK BOLEH** disajikan data operasional yang membingungkan seperti:
- Riwayat Harga (Price History)
- Revision List
- Version History
UI harus dipertahankan sebersih mungkin demi *User Experience* yang optimal dan kecepatan *decision making*.

### Rule 2.3 - In-Place Update
Setiap kali terjadi pembaruan harga (misal: Rp 31.500.000 menjadi Rp 32.500.000), sistem secara otomatis melakukan:
1. **Mengganti *Active Price*** langsung pada entitas Paket.
2. **Mencatat event ke Audit Log**, sebagai rekaman internal *behind the scene*.

Sistem **TIDAK** membuat tabel relasi riwayat versi pada struktur utama paket yang diekspos ke UI.

## 3. Core Principle
> **"Generate Paket adalah Configuration."**

Paket yang dikonfigurasi bertindak sebagai *Master Template / Configuration* bagi operasional. Oleh karena itu, master configuration hanya mendiktekan status *terkini*, sedangkan riwayat akan di-handle melalui lapisan analitik/audit, dan data transaksional akan di-handle melalui kebijakan *Snapshot*.
