# ADR-0016: Integrasi Dokumen Tour Leader (Paspor & Pas Foto) dengan Ekstraksi OCR Otomatis dan Penyimpanan Cloud Google Drive

## Status
APPROVED (Product Owner Approved)

## Date
2026-09-05

## Context
Pada sistem operasional PT Vauza Tamma Abadi (VTU ABADI Travel), Tour Leader (TL) merupakan garda terdepan pelaksanaan ibadah umroh yang datanya wajib terintegrasi dengan manifest maskapai, pengurusan visa muassasah, dan hotel rooming.

Sebelumnya, tabel `MasterPetugas` hanya menampung atribut dasar:
- `nama` (Nama Lengkap)
- `noHp` (Nomor Telepon/WA)
- `tipe` ("TOUR_LEADER" | "MUTHOWIF")
- `isActive` (Status Keaktifan)

Ketiadaan data dokumen paspor dan pas foto Tour Leader menyebabkan proses manifest keberangkatan masih memerlukan entri manual atau pengumpulan berkas terpisah di luar sistem.

Kebutuhan baru dari Product Owner:
1. **Dua Data Dokumen Tambahan untuk Tour Leader**:
   - **Paspor** (Dokumen paspor resmi)
   - **Pas Foto** (Foto formal Tour Leader)
2. **Antarmuka Drag-and-Drop**:
   - Pengunggahan berkas paspor dan pas foto wajib mendukung aksi *Drag-and-Drop* langsung pada modal tambah/edit Tour Leader.
3. **Ekstraksi Otomatis via AI OCR untuk Paspor**:
   - Berkas paspor yang diunggah tidak hanya disimpan sebagai file, melainkan langsung diekstrak seluruh informasinya melalui engine AI OCR (`processDocument` / `PassportParser`).
   - Data hasil ekstraksi (Nomor Paspor, Tanggal Dikeluarkan, Tanggal Habis Berlaku, Tempat/Kota Terbit, NIK, Tempat & Tanggal Lahir, Jenis Kelamin) wajib dimasukkan dan disimpan ke tabel `master_petugas` di database.
4. **Target Penyimpanan Google Drive**:
   - Berkas fisik (file paspor dan pas foto) wajib disimpan ke direktori Google Drive dengan Folder ID:
     `184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G`

## Decision

Arsitektur sistem menyepakati keputusan teknis berikut:

### 1. Perluasan Skema Database (`prisma/schema.prisma`)
Menambahkan atribut dokumen dan data paspor pada model `MasterPetugas`:
```prisma
model MasterPetugas {
  id              String    @id @default(cuid())
  kode            String?   @unique
  nama            String
  tipe            String    // "TOUR_LEADER" or "MUTHOWIF"
  noHp            String?
  isActive        Boolean   @default(true)

  // Dokumen & Storage Google Drive (Folder: 184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G)
  pasporUrl       String?
  pasporDriveId   String?
  fotoUrl         String?
  fotoDriveId     String?

  // Data Paspor Hasil Ekstraksi OCR
  nomorPaspor     String?
  tglDikeluarkan  DateTime? // Tanggal terbit paspor
  tglHabis        DateTime? // Tanggal kadaluarsa paspor
  kotaPaspor      String?   // Kantor imigrasi / kota penerbit paspor
  nik             String?   // NIK KTP
  tempatLahir     String?   // Tempat lahir
  tanggalLahir    DateTime? // Tanggal lahir
  jenisKelamin    String?   // "L" | "P"

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("master_petugas")
}
```

### 2. Endpoint Khusus Ekstraksi OCR Paspor Petugas (`/api/master/petugas/ocr-paspor`)
- Menerima berkas gambar paspor (PNG/JPG/WEBP/PDF) via multipart `FormData`.
- Mengonversi berkas ke memory buffer dan memanggil engine `processDocument(buffer, "paspor", 0)`.
- Mengembalikan response JSON terstruktur berisi:
  - `nomorPaspor`
  - `namaLengkap`
  - `tempatTerbitPaspor` (kotaPaspor)
  - `tanggalTerbitPaspor` (tglDikeluarkan)
  - `tanggalKadaluarsa` (tglHabis)
  - `tempatLahir`
  - `tanggalLahir`
  - `jenisKelamin`
  - `nik`
  - `confidence`
- Memberikan respon instan ke client untuk auto-fill formulir modal Tour Leader tanpa perlu reload.

### 3. Penanganan Upload File ke Google Drive Spesifik
- Menggunakan `getStorageAdapter()` dan memanggil method:
  `upload(fileName, buffer, contentType, "184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G")`
- Penamaan file terstandarisasi untuk mencegah bentrok dan mempermudah audit fisik di Google Drive:
  - Paspor: `PASPOR_TL_${namaClean}_${nomorPaspor || Date.now()}.${ext}`
  - Pas Foto: `FOTO_TL_${namaClean}_${Date.now()}.${ext}`
- URL download yang tersimpan di database: `/api/storage/download?id=${fileId}` atau Drive URL langsung.

### 4. Pembaruan API Master Petugas (`/api/master/petugas` & `[id]`)
- Endpoint POST dan PUT menerima payload data Tour Leader termasuk data paspor dan berkas file/Drive ID.
- Mendukung pembaruan parsial maupun menyeluruh (update nama, no HP, status aktif, berkas foto, berkas paspor, dan parameter paspor).

### 5. Antarmuka Pengguna (UI/UX) pada Modal dan Tabel Master Petugas (`/admin/master/petugas/page.tsx`)
1. **Modal Form Tour Leader**:
   - Area Drag-and-Drop Pas Foto dengan preview gambar bulat/avatar formal.
   - Area Drag-and-Drop Paspor dengan preview thumbnail dan indikator status OCR:
     - Saat file di-drop: Animasi scanning "Mengekstrak data paspor via AI OCR...".
     - Selesai scan: Notifikasi sukses + formulir data paspor terisi otomatis.
   - Kolom form hasil ekstraksi yang dapat ditinjau/diedit oleh admin sebelum disimpan:
     - Nomor Paspor
     - Tanggal Dikeluarkan & Tanggal Habis Berlaku
     - Kantor/Kota Penerbit Paspor
     - NIK
     - Tempat Lahir & Tanggal Lahir
     - Jenis Kelamin (L/P)
2. **Tabel Master Petugas (Tab Tour Leader)**:
   - Menampilkan foto avatar petugas.
   - Menampilkan kolom informasi Paspor (Nomor Paspor & Badge Masa Berlaku Aktif/Kadaluarsa).
   - Tombol/Link cepat untuk melihat dokumen paspor dan foto secara langsung.

## Consequences
- **Positive**: Data Tour Leader menjadi lengkap dan siap pakai untuk keperluan manifest penerbangan, visa, dan SISKOPATUH tanpa perlu input manual yang rentan kesalahan.
- **Positive**: Ekstraksi AI OCR otomatis memangkas waktu kerja staf administrasi dari hitungan menit menjadi hitungan detik.
- **Positive**: Berkas fisik terpusat secara rapi di Google Drive resmi VTU pada folder ID khusus `184fhhhwKNxe_Xy6lBs2h6oPfjbRyLE-G`.
- **Governance Compliance**: Memenuhi ketentuan EEOS Baseline v1.2 (EES Tier 1 Evidence & ADR Trigger Policy).
