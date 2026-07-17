# Master Configuration UX Flow
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. User Journey Flow (Admin/Manager)

### Step 1: Listing & Search (Dashboard)
- Halaman List menampilkan tabel data master.
- Fitur pencarian (*Search*) dan filter cepat (Active/Inactive).
- UX Rule: Tabel harus mendukung paginasi (Server-side rendering) untuk mencegah lag jika data membesar.

### Step 2: Create (Form Input)
- Klik tombol `[+ Create Master]`.
- Muncul modal atau halaman form.
- UX Rule: Validasi sinkron seketika saat user mengetik (*Real-time Validation*). Kolom wajib ditandai bintang merah. Jika gagal, error muncul spesifik di bawah input.

### Step 3: Edit / Inactive (Modifikasi)
- User klik baris tabel → Halaman *Detail / Edit*.
- Tersedia tombol (Toggle) `[Active ↔ Inactive]`.
- UX Rule: Jika user klik *Inactive*, muncul *Confirmation Dialog* (Peringatan bahwa data tidak akan muncul lagi di pembuatan paket baru).

### Step 4: Delete (Guarded Action)
- Tersedia tombol `[Delete]` berwarna merah.
- UX Rule: Jika API mendeteksi data sedang dipakai (Referenced), tombol langsung `Disabled` dengan *Tooltip*: "Data sedang digunakan oleh Paket/Order. Gunakan fitur Inactive."

### Step 5: Audit Tracking
- Pada halaman detail, terdapat tombol (Navigation Reference) `[View Activity History]`.
- Mengarahkan user ke Enterprise Activity Center (EAC) dengan filter entitas spesifik yang telah aktif.
