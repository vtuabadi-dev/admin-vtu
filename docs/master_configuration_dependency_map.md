# Master Configuration Dependency Map
**Phase:** IMPLEMENTATION PLANNING
**Target:** VTU ABADI Enterprise Travel Management System

## 1. Core Dependency Graph
Grafik ini memastikan tidak ada *Circular Dependency*. Alur panah (→) berarti "Membutuhkan / Bergantung Pada".

```text
Generate Paket Umroh
├── Jenis Paket
├── Starting Point
├── Lama Perjalanan (Durasi)
│   └── Mempengaruhi Kalkulasi (Arrival Date, Return Date, Room Nights)
├── Landing Pattern
│   ├── Mempengaruhi (Flight Route / Rute Bus)
│   └── Mempengaruhi Urutan Hotel (Makkah dulu atau Madinah dulu)
├── Maskapai
├── Klaster
│   └── Membutuhkan referensi dari Master Hotel (Hotel terhubung ke Klaster)
├── Hotel
│   ├── Makkah Hotel
│   └── Madinah Hotel
└── Perlengkapan
```

## 2. Dependency Resolution Strategy
- **Master Data (Leaf Nodes):** Jenis Paket, Starting Point, Durasi, Landing Pattern, Maskapai, Perlengkapan, dan Hotel harus dibangun TERLEBIH DAHULU karena mereka adalah *independent nodes*.
- **Intermediate Nodes:** Klaster dibangun setelah Hotel.
- **Root Node:** Generate Paket dibangun TERAKHIR setelah seluruh *leaf nodes* teruji stabil.

## 3. Engineering Implementation Rule
- **Foreign Key Constraint:** Pada relasi *Generate Paket* ke *Master Data*, sistem wajib mereferensikan `id` dari master data tersebut.
- **Immutability (Snapshot Protection):** Walaupun berelasi via FK, saat paket tersebut "Diorder", seluruh properti master (Nama, Harga) WAJIB di-copy (Hard-copy/Snapshot) ke dalam tabel Order agar kebal dari update Master Data.
