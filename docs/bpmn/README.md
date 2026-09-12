# Dokumentasi BPMN 2.0 — VTU Abadi Operasional System
**Aplikasi Manajemen Operasional Travel Umroh VTU Abadi (`app-admin-vtu`)**  
*Single Source of Truth: Group-Centric Architecture, Package Lifecycle Sub-Process, Corrected 10-Step Registration Flow, Invoicing & Manifest Ingestion*

---

## 1. File Standar BPMN 2.0 XML Resmi Aplikasi

File standar BPMN 2.0 yang dimodelkan langsung dari arsitektur backend, Prisma schema, API routes, dan alur pendaftaran rombongan yang telah dikoreksi telah diperbarui di:
- 👉 [**`docs/bpmn/vtu-operasional-system-bpmn.bpmn`**](file:///d:/Projects/app-admin-vtu/docs/bpmn/vtu-operasional-system-bpmn.bpmn) *(85.3 KB)*

File ini mematuhi standar internasional **OMG BPMN 2.0**, lengkap dengan koordinat visual (BPMNDI), color codes per aktor, **Expanded Sub-Process Container**, gateways, data objects, data stores, serta konektor message flow ke sistem eksternal (Telegram Bot, Gemini AI Vision OCR, Google Drive).

Dapat langsung dibuka & diedit secara visual di:
1. [**demo.bpmn.io**](https://demo.bpmn.io) (Tinggal drag & drop file `.bpmn`)
2. **Camunda Modeler**
3. **Enterprise Architect / Signavio / Visual Paradigm**

---

## 2. Alur Pendaftaran Rombongan & Pengambilan Perlengkapan (Koreksi Alur)

Sesuai kebutuhan operasional nyata di lapangan, urutan registrasi grup jamaah kini tersusun secara berurutan dan transparan:

```mermaid
graph TD
    Start(["● Mulai Pendaftaran"]):::event --> S1["1. Jamaah: Isi Data Group (PIC & Anggota)"]:::taskJamaah
    S1 --> S2["2. Jamaah: Pilih Paket & Jadwal Keberangkatan"]:::taskJamaah
    S2 --> S3["3. Jamaah: Tentukan Komposisi Kamar (Quad/Triple/Double)"]:::taskJamaah
    S3 --> S4["4. Sistem VTU: Kalkulasi Otomatis Total Biaya & Nominal DP"]:::taskSistem
    S4 --> S5["5. Jamaah: Upload Bukti Transfer DP & Submit Formulir"]:::taskJamaah
    S5 --> S6["6. Sistem VTU: Generate PDF Formulir Pendaftaran Bertanda Tangan"]:::taskSistem
    S6 --> S7["7. Admin Ops: Peninjauan Registrasi & Validasi Bukti Transfer DP"]:::taskOps
    S7 --> GateReview{"Registrasi & DP Valid?"}:::gateway
    GateReview -- "Revisi" --> S5
    GateReview -- "Valid" --> S8["8. Admin Finance: Terbitkan Invoice Resmi (DP & Group)"]:::taskFinance
    S8 --> S9["9. Sistem VTU: Approve Registrasi, Buat Akun & Ingest ke Manifest"]:::taskSistem
    S9 --> S10["10. Jamaah: Pengambilan Perlengkapan Umroh (Koper, Ihram, Seragam)"]:::taskJamaah
    S10 --> SNext["Lanjut: Upload Berkas Paspor & Dokumen Visa"]:::taskJamaah

    classDef event fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px,color:#000;
    classDef gateway fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000;
    classDef taskJamaah fill:#e1f5fe,stroke:#0288d1,stroke-width:1.5px,color:#000;
    classDef taskSistem fill:#eceff1,stroke:#455a64,stroke-width:1.5px,color:#000;
    classDef taskOps fill:#e8f5e9,stroke:#2e7d32,stroke-width:1.5px,color:#000;
    classDef taskFinance fill:#fce4ec,stroke:#c2185b,stroke-width:1.5px,color:#000;
```

### Rincian 10 Tahapan:
1. **Isi Data Group (`Task_J_RegisterGroup`)**: Pemohon / PIC mengisi data perwakilan, kontak, dan jumlah serta nama anggota rombongan keluarga.
2. **Pemilihan Paket (`Task_J_PilihPaket`)**: Jamaah memilih program keberangkatan dari katalog yang aktif.
3. **Menentukan Komposisi Kamar (`Task_J_KomposisiKamar`)**: Menentukan alokasi kamar (Quad / Triple / Double) dan pilihan paket hotel.
4. **Hasil Nominal Pembayaran (`Task_Sys_HitungNominal`)**: Sistem di Row 2 secara otomatis mengkalkulasi total biaya dan menampilkan nominal kewajiban Down Payment (DP).
5. **Upload Bukti TF DP & Submit (`Task_J_UploadBuktiDP`)**: Jamaah mentransfer DP sesuai nominal, mengunggah slip setoran/bukti transfer, membubuhkan tanda tangan digital, dan menekan tombol *Submit*.
6. **Generate PDF Formulir (`Task_Sys_GenPDF`)**: Sistem memproduksi berkas PDF Formulir Pendaftaran resmi bertanda tangan, menyimpannya di vault server, dan mengirimkan email konfirmasi.
7. **Peninjauan Admin Operasional (`Task_Ops_ReviewRegistrasi`)**: Tim operasional memeriksa kebenaran data rombongan, ketersediaan kuota seat, dan validitas bukti transfer bank.
8. **Penerbitan Invoice Resmi (`Task_Pay_TerbitkanInvoice`)**: Admin Pembayaran menerbitkan nomor invoice resmi (`INV/YYYY/NNNNN`) tagihan DP dan induk grup.
9. **Ingest ke Manifest (`Task_Sys_IngestManifest`)**: Status registrasi disetujui, akun portal jamaah dibuat, dan seluruh anggota rombongan langsung di-ingest ke dalam **Manifest Keberangkatan**.
10. **Pengambilan Perlengkapan Umroh (`Task_J_AmbilPerlengkapan`)**: Jamaah menerima hak pengambilan paket logistik umroh (koper bagasi, tas paspor, kain ihram / mukena, seragam batik, buku panduan doa).

---

## 3. Rincian Sub-Proses: Pembuatan & Manajemen Paket Umroh

Sub-proses ini ditempatkan di **Row 3 (`ADMIN OPERASIONAL`)** sebagai kontainer *Expanded Sub-Process* (`SubProcess_ManajemenPaket`), mendukung **2 Metode Input** (Manual Wizard vs AI OCR Brosur) dan **4 Skenario Output Manajemen Paket**:

```mermaid
graph TD
    StartSub(["● Mulai Pembuatan Paket"]):::event --> GateInput{"Metode Input Paket?"}:::gateway

    %% METODE A: MANUAL WIZARD
    GateInput -- "1. Manual Wizard" --> GateTipe{"Tipe / Output Paket?"}:::gateway

    %% METODE B: AI OCR BROSUR / FLYER
    GateInput -- "2. AI OCR Brosur" --> OCR_Upload["Upload Flyer Brosur Umroh / Paste Caption Teks"]:::taskOCR
    OCR_Upload --> OCR_Gemini["Gemini AI Vision & OCR (Ekstrak Jadwal, Maskapai, Hotel, Harga)"]:::taskOCRService
    OCR_Gemini --> OCR_Matcher["Auto-Match Master Data (Hotel, Maskapai, Rute) & Resolusi Konflik"]:::taskOCR
    OCR_Matcher --> GateTipe

    %% 4 CABANG OUTPUT MANAJEMEN PAKET
    GateTipe -- "A. Paket Baru" --> B1_1["Setting Klaster (Gold/Silver) & Opsi Hotel"]:::taskBaru
    B1_1 --> B1_2["Generate X Paket Keberangkatan Independen"]:::taskBaru

    GateTipe -- "B. Pembaruan Paket" --> B2_1["Pilih Paket Existing & Load Snapshot"]:::taskUpdate
    B2_1 --> B2_2["Update Jadwal, Kuota, Harga & Hotel"]:::taskUpdate
    B2_2 --> B2_3["Pencatatan Versi Revisi & Audit Log"]:::taskUpdate

    GateTipe -- "C. Split Starting" --> B3_1["Pilih Parent Paket & Tentukan Multi-Starting (JKT/SUB/KJT)"]:::taskSplitStart
    B3_1 --> B3_2["Generate Child Package & Link ke PaketGrup"]:::taskSplitStart

    GateTipe -- "D. Split Promo" --> B4_1["Duplikasi Paket untuk Skema Promo (Early Bird/Flash Sale)"]:::taskSplitPromo
    B4_1 --> B4_2["Override Harga Promo & Batas Kuota Khusus"]:::taskSplitPromo

    %% MERGE
    B1_2 --> GateMerge{"Merge"}:::gateway
    B2_3 --> GateMerge
    B3_2 --> GateMerge
    B4_2 --> GateMerge

    GateMerge --> SubPublish["Validasi Kesiapan Paket & Publish ke Katalog"]:::taskPublish
    SubPublish --> EndSub(["■ Paket Siap Dijual"]):::endEvent

    classDef event fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px,color:#000;
    classDef endEvent fill:#a5d6a7,stroke:#2e7d32,stroke-width:3px,color:#000;
    classDef gateway fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000;
    classDef taskOCR fill:#f3e5f5,stroke:#6a1b9a,stroke-width:1.5px,color:#000;
    classDef taskOCRService fill:#ea80fc,stroke:#4a148c,stroke-width:2px,color:#000;
    classDef taskBaru fill:#e8f5e9,stroke:#2e7d32,stroke-width:1.5px,color:#000;
    classDef taskUpdate fill:#e1f5fe,stroke:#0288d1,stroke-width:1.5px,color:#000;
    classDef taskSplitStart fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1.5px,color:#000;
    classDef taskSplitPromo fill:#fce4ec,stroke:#c2185b,stroke-width:1.5px,color:#000;
    classDef taskPublish fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000;
```

---

## 4. Susunan 8 Swimlanes (Urutan Baris / Row)

| No (Row) | Lane / Role | Kode Role Sistem | Posisi & Tanggung Jawab Utama |
|:---|:---|:---|:---|
| **Row 1** | **JAMAAH / KETUA GROUP** | `jamaah` | Mengisi data group, memilih paket, tentukan kamar, upload bukti bayar DP, terima perlengkapan, upload berkas paspor, pelunasan, hingga keberangkatan dan kepulangan. |
| **Row 2** | **SISTEM VTU & AI ENGINE** | *Automated Service* | Auto-broadcast jadwal ke Telegram, kalkulasi nominal total & DP, generate PDF formulir bertanda tangan, ingest data ke manifest, Gemini OCR, auto-deadlines, sinkronisasi Google Drive, dan immutable `AuditEntry`. |
| **Row 3** | **ADMIN OPERASIONAL** | `admin_operasional` | **Sub-Proses Manajemen Paket:** Paket baru, update, split starting, split promo; peninjauan pendaftaran baru & bukti transfer DP; serta closing paket keberangkatan. |
| **Row 4** | **ADMIN DOKUMEN** | `admin_dokumen` | Manual review berkas buram/OCR error, verifikasi paspor (>6 bulan), approval kelayakan dokumen visa. |
| **Row 5** | **ADMIN PEMBAYARAN** | `admin_pembayaran` | Penerbitan invoice resmi (DP & Pelunasan), invoice split group (A/B/C), rekonsiliasi mutasi bank, alokasi pembayaran per jamaah. |
| **Row 6** | **ADMIN MANIFEST & ROOMING** | `admin_manifest` | Finalisasi manifest jamaah, grouping kombinasi hotel Mekkah/Madinah, dan eksekusi algoritma *Rooming Engine* (Quad/Triple/Double, Mahram & Gender). |
| **Row 7** | **TOUR LEADER** | `tour_leader` | Serah terima (*handover*) final manifest & rooming list, manasik jamaah, pendampingan spiritual & logistik di Makkah/Madinah, laporan TL. |
| **Row 8** | **ADMIN BADAL & WAKAF** | `admin_badal` | Layanan khusus: pemrosesan order badal umroh & wakaf mushaf Quran, penugasan muthawif di Makkah, serta upload video dokumentasi & sertifikat badal. |

---

## 5. Kepatuhan Validasi Standard OMG BPMN 2.0

Verifikasi integritas model XML diuji secara otomatis dengan hasil:
- **Total IDs Terdaftar**: 405 Node & Element
- **Total Warnings**: 0 Warning
- **Status Kompatibilitas**: **100% Valid OMG BPMN 2.0 & BPMNDI Standard** (Bisa langsung dibuka di [demo.bpmn.io](https://demo.bpmn.io) dan Camunda Modeler).
