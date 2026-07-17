# Navigation Architecture & UX Recommendation

## 1. Layout & UX Pattern
Dikarenakan kompleksitas proses "Generate Paket Umroh" yang meliputi pemilihan data referensi, penentuan banyak tanggal, serta penetapan dinamika klaster dan harga, UX dilarang menggunakan Single Long Form.

**Rekomendasi Utama: Stepper / Wizard UI Pattern.**
Wizard memandu admin *step-by-step* untuk mengurangi *cognitive load* (kelelahan berpikir) dan meminimalisir *human error*.

## 2. Wizard Steps (Navigation Flow)

### Step 1: Base Configuration (Informasi Dasar)
- Card/Section untuk memilih Master Data.
- Input: Jenis Paket, Starting Point, Durasi, Maskapai, Pola Landing, Kategori Perlengkapan.

### Step 2: Schedule (Penentuan Tanggal)
- Input Tanggal Keberangkatan menggunakan komponen *Multi-date Picker* atau *Add Multiple Rows*.
- Sistem secara reaktif menampilkan kolom Tanggal Kedatangan (auto-calculated namun editable) di sebelah setiap Tanggal Keberangkatan yang dipilih.

### Step 3: Klaster, Hotel & Pricing
- Pertanyaan Toggle: "Menggunakan Klaster?" (Yes/No).
- **Jika Yes**: Muncul kumpulan Checkbox Master Klaster. Setiap checkbox yang dicentang akan mengekspansi sebuah *Sub-Form Card* yang meminta input: Harga, Dropdown Hotel Makkah, Dropdown Hotel Madinah.
- **Jika No**: Langsung tampil 1 Form Input untuk Harga, Hotel Makkah, Hotel Madinah.

### Step 4: Summary & Generation
- Menampilkan konfirmasi rekap: "Anda akan melakukan generate 5 Paket Keberangkatan."
- Menampilkan rincian tabel *preview*.
- Tombol CTA Utama: **Generate Paket**.

## 3. UI Component Details
- **Drawer/Dialog** tidak disarankan untuk proses *Generate* ini karena form terlalu *massive*. Lebih baik menggunakan Full Page form dengan pola Wizard.
- Sediakan indikator *progress* (Step 1 of 4) di bagian atas halaman.
