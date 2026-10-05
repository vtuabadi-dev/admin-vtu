# ADR-0022: Kebijakan Penghapusan Berantai (Cascade Deletion) Rombongan & Anggota Saat PIC Dihapus

## Status
APPROVED (Product Owner Approved via Consultation)

## Tanggal
2026-10-04

## Domain
Registration, Group Hierarchy, Jamaah Management, Departure Quota, Manifest & Billing

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks & Permasalahan (Context & Problem Statement)

1. **Perilaku Penghapusan Parsial vs Rombongan**:
   - Pendaftaran jamaah pada sistem berbasis rombongan (*registration group*), di mana setiap rombongan dipimpin oleh seorang PIC (*Penanggung Jawab / Ketua Rombongan*) yang sekaligus terdaftar sebagai anggota ke-1 (`nomorPeserta: PS/.../1`).
   - Pada implementasi sebelumnya di endpoint `DELETE /api/jamaah/[id]`, terjadi celah logika (*bracket bug*): saat seorang jamaah yang berstatus PIC dihapus secara permanen, sistem secara keliru menghapus record entitas `registration_groups`, tetapi **tidak menghapus anggota-anggota lain di dalam rombongan tersebut**.
   - Hal ini menghasilkan data yatim (*orphaned jamaah records*) yang tidak memiliki induk rombongan valid, merusak konsistensi query relasional Prisma (`Field group is required to return data, got null instead`), serta meninggalkan sisa alokasi kuota (`terisi`) pada paket keberangkatan.

2. **Kebutuhan Aturan Bisnis (Product Owner Requirement)**:
   - Hubungan antara pendaftaran rombongan dan PIC bersifat hierarkis mutlak (*single root authority*).
   - Apabila PIC (ketua pendaftaran) dihapus dari sistem, maka secara operasional seluruh pendaftaran rombongan tersebut dianggap batal/dihapus secara keseluruhan.
   - Sebaliknya, jika yang dihapus adalah anggota biasa (non-PIC), hanya anggota bersangkutan yang dihapus, sementara rombongan, PIC, dan anggota lainnya tetap aktif.

---

## 2. Keputusan Arsitektur (Decision)

1. **Aturan Bisnis Penghapusan (Deletion Business Rules)**:
   - **Kondisi A: Yang Dihapus adalah PIC / Ketua Rombongan (`jamaah.id === group.ketuaGroupId` atau Nomor Peserta Urut 1)**:
     - Sistem menjalankan **Cascade Delete Rombongan Penuh**:
       1. Menghapus seluruh record jamaah yang tergabung di dalam rombongan tersebut (`groupId`).
       2. Menghapus seluruh manifest row (`ManifestRow`), dokumen lampiran (`DokumenItem`), alokasi kamar (`PenghuniKamar`), alokasi pembayaran (`AlokasiPembayaran`), dan pengambilan perlengkapan (`PengambilanPerlengkapanItem`) dari SEMUA anggota rombongan.
       3. Menghapus seluruh data tagihan & kwitansi rombongan (`InvoiceItem`, `Invoice`, `Pembayaran`, `InvoiceSplitConfig`, `Reminder`).
       4. Menghapus data permohonan pendaftaran awal (`RegistrationMember`, `RegistrationRequest`).
       5. Menghapus entitas grup pendaftaran (`RegistrationGroup`).
       6. Mengurangi kuota terisi paket keberangkatan (`keberangkatan.terisi`) sejumlah **total anggota aktif** yang terhapus.
   - **Kondisi B: Yang Dihapus adalah Anggota Biasa (Bukan PIC)**:
     - Sistem hanya menghapus jamaah bersangkutan:
       1. Menghapus child records milik jamaah tersebut (dokumen, manifest row, dll).
       2. Mengurangi `jumlahAnggota` pada `RegistrationGroup` sebanyak 1.
       3. Mengurangi kuota terisi paket keberangkatan (`keberangkatan.terisi`) sebanyak 1.
       4. PIC dan anggota lainnya di dalam rombongan tetap utuh.

2. **Ketahanan Data Repository (Defensive Resilience)**:
   - Repository [manifest.repository.ts](file:///d:/Projects/app-admin-vtu/src/server/repositories/manifest.repository.ts) dan repository terkait wajib menerapkan penanganan defensif terhadap kemungkinan relasi grup terputus (*nullable resilience*), sehingga tidak memicu *PrismaClientUnknownRequestError* (HTTP 500) pada API publik.

---

## 3. Konsekuensi & Dampak (Consequences)

- **Positif**:
  - Mencegah timbulnya *orphaned records* di tabel `jamaah` dan `ManifestRow`.
  - Kuota paket keberangkatan di dashboard, daftar paket aktif, dan manifest selalu konsisten dan sinkron secara matematis.
  - Alur kerja admin menjadi lebih intuitif: menghapus akun perwakilan pendaftaran otomatis membersihkan seluruh berkas rombongannya.
- **Tindakan Pencegahan**:
  - Dialog konfirmasi pada frontend saat menghapus PIC disarankan menginformasikan dengan jelas bahwa tindakan tersebut akan menghapus seluruh anggota rombongan.
