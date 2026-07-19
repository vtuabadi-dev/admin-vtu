# Product Requirements Document (PRD): Generate Paket Umroh

## 1. Overview
Modul "Generate Paket Umroh" adalah fasilitas bagi Admin untuk meracik produk paket keberangkatan menggunakan parameter-parameter yang diambil dari Configuration Center (Master Data), serta menentukan harga jual dan alokasi hotel secara dinamis.

## 2. Input Parameters
Sistem harus mengakomodasi parameter berikut saat proses generate:
1. **Jenis Paket**: Diambil dari Master Jenis Paket.
2. **Starting Point**: Diambil dari Master Starting Point.
3. **Durasi Perjalanan**: Diambil dari Master Durasi.
4. **Maskapai Internasional**: Diambil dari Master Maskapai.
5. **Pola Landing**: Diambil dari Master Pola Landing.
6. **Tanggal Keberangkatan**: Mendukung input *Multiple Dates* (Banyak tanggal sekaligus).
7. **Tanggal Kedatangan**: Diisi otomatis oleh sistem dengan rumus `Tanggal Berangkat + Durasi - 1 Hari`. Field ini wajib tetap *editable* oleh Admin jika terjadi anomali penerbangan.
8. **Kategori Perlengkapan**: Diambil dari Master Kategori Perlengkapan (Hanya sebagai label pengikat paket).
9. **Kode Paket**: Sistem harus men-generate kode unik secara otomatis (misal: PKT-JED-20261015-001).
10. **Menggunakan Klaster?**: Boolean (Ya / Tidak).

## 3. Functional Requirements: Klaster & Pricing
- **Jika Klaster = TIDAK**:
  - Admin hanya diminta memasukkan **1 Harga Paket**, **1 Hotel Makkah**, dan **1 Hotel Madinah**.
- **Jika Klaster = YA**:
  - Admin dapat mencentang klaster apa saja yang berlaku pada paket ini (misal: Silver, Gold, Platinum).
  - Untuk **Setiap Klaster yang dipilih**, Admin wajib memasukkan harga dan mengalokasikan Hotel Makkah serta Hotel Madinah secara independen. (Contoh: Silver -> Hotel A & B, Gold -> Hotel C & D).

## 4. Output
Ketika Admin menekan tombol "Generate", sistem akan melakukan iterasi berdasarkan jumlah `Tanggal Keberangkatan` yang diinput, lalu melahirkan `X` buah Data Paket Umroh siap jual yang independen.
