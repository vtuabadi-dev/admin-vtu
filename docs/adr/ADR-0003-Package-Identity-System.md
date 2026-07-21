# ADR-0003: Package Identity System — ID Paket, Kode Individual, dan Kode Grup

## Status
PROPOSED

## Tanggal
2026-07-20

## Konteks
Saat ini model `Keberangkatan` di database hanya memiliki kolom `kode` (format lama: `KBR-1447-001`) yang bersifat umum dan tidak memiliki makna bisnis yang dapat dibaca secara langsung.

Sistem membutuhkan **Package Identity System** yang lebih kaya untuk mendukung:
1. **ID Paket** yang bersifat permanen sebagai Single Source of Truth.
2. **Kode Paket Individual** yang bermakna dan dapat dibaca oleh tim operasional maupun jamaah (contoh: `#2026_15H_TUR_SV_AUG05`).
3. **Kode Paket Grup** sebagai payung yang menghubungkan beberapa keberangkatan yang disubmit bersama dalam satu kampanye pemasaran (contoh: `#2026_15H_TUR_SV_AUG_SEP_OCT_NOV`). Kode ini hanya ada jika lebih dari satu tanggal disubmit bersama.

## Keputusan
Menambahkan dua perubahan pada skema database:

### A. Modifikasi Model `Keberangkatan`
Tambahkan kolom berikut:
- `kodeIndividu String @unique` — Kode paket individual yang dibuat otomatis
- `paketGrupId String?` — FK opsional ke model `PaketGrup`
- `driveFolderIds Json?` — Registry ID folder Google Drive (diputuskan di ADR-0002)

### B. Model Baru `PaketGrup`
Model baru untuk menampung grup keberangkatan yang memiliki lebih dari satu tanggal:
```prisma
model PaketGrup {
  id        String   @id @default(cuid())
  kodeGrup  String   @unique  // contoh: #2026_15H_TUR_SV_AUG_SEP_OCT_NOV
  namaPaket String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  keberangkatan Keberangkatan[]

  @@map("paket_grup")
}
```

## Formula Kode

### Kode Individual
```
#{TAHUN}_{DURASI}H_{IDENTIFIER}_{KODE_MASKAPAI}_{BULAN_ENG_3HURUF}{TANGGAL_2DIGIT}
```
Di mana `IDENTIFIER`:
- Jika `packageType.code == "REG"` → `startingPoint.code` (contoh: JKT, SBY)
- Jika `packageType.code != "REG"` → `packageType.code` (contoh: TUR, DUB, EUR)

### Kode Grup
```
#{TAHUN}_{DURASI}H_{IDENTIFIER}_{KODE_MASKAPAI}_{BULAN_UNIK_1}_{BULAN_UNIK_2}_...
```
Daftar bulan diambil dari semua tanggal dalam grup, diurutkan kronologis tanpa duplikasi.

## Konsekuensi
- Positif:
  * Kode paket bermakna dan mudah dibaca tim operasional.
  * Kode paket dapat digunakan sebagai identifikasi publik di flyer digital.
  * Relasi grup keberangkatan tersimpan secara eksplisit di database.
- Negatif:
  * Memerlukan migrasi skema database (additive, tidak destructive).
- Netral:
  * Kolom `kode` lama tetap dipertahankan untuk backward compatibility selama masa transisi.
