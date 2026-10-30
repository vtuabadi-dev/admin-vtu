# ADR-0029: Aturan Wajib Minimal Dua Suku Kata Nama dan Prioritas Revisi Manual pada Surat Rekomendasi Paspor

## Status
APPROVED (by Product Owner)

## Date
2026-10-29

## Context
Dalam prosedur operasional pembuatan Surat Rekomendasi Paspor (keimigrasian/Kemenag) untuk keperluan ibadah Umroh:
1. **Ketentuan Jumlah Suku Kata Nama**:
   - Pihak Imigrasi mewajibkan nama pemohon paspor memiliki minimal 2 (dua) suku kata nama (word count).
   - Saat ini, sistem autocrat dan form surat (`/admin/surat`) hanya menggabungkan nama ayah kandung ke nama jamaah jika perihal surat secara eksplisit memuat kata kunci *"endorse"* (`isEndorsement = currentHal.includes("endorse")`).
   - Apabila perihal surat adalah rekomendasi paspor reguler (misal *"Rekomendasi Pembuatan / Penggantian Paspor Umroh"*), sistem mengekstrak nama KTP apa adanya.
2. **Kendala pada Nama Mononim (Satu Suku Kata)**:
   - Jika nama jamaah hasil ekstrak KTP hanya terdiri dari 1 suku kata (misal *"Siti"*, *"Supriyadi"*, *"Nurhasanah"*), surat rekomendasi yang digenerate menghasilkan nama tunggal yang berisiko ditolak oleh Kantor Imigrasi karena belum memenuhi kuota minimal 2 suku kata.
   - Admin sebelumnya harus menyadari hal ini dan mengetikkan nama gabungan secara manual atau mengganti perihal menjadi endorsement.
3. **Ketersediaan Data Ayah Kandung**:
   - Data nama ayah kandung pemegang KTP tersedia pada dokumen pendukung berupa **Akta Kelahiran** (`akta`) atau **Kartu Keluarga** (`kk`).
   - Namun pada engine autocrat sebelumnya (`src/shared/lib/surat-autocrat-engine.ts`), pencarian dokumen pendukung hanya memeriksa jenis `kk` dan `buku_nikah`, belum menyertakan `akta`.
4. **Masalah Rigiditas Sumber Data OCR vs Ketikan Manual Admin**:
   - Selama ini, saat sumber data mode OCR aktif, sistem bersikap terlalu kaku di mana setiap perubahan re-render atau template dapat menimpa kembali (*overwrite*) kolom isian dengan data mentah OCR.
   - Padahal, hasil ekstraksi AI OCR hanyalah **sumber data referensi utama (initial autofill)**, bukan satu-satunya sumber mutlak yang menolak atau menghapus tambahan ketikan/revisi manual dari admin.
   - Apabila nama ayah tidak ditemukan di KK/Akta, admin harus leluasa menambahkan kata pada kolom isian (misal mengetikkan nama tambahan atau nama ayah secara manual), dan ketikan tersebut **wajib tertera serta tersimpan permanen pada surat**.

## Decision
1. **Otomasi Minimal 2 Suku Kata Nama Khusus Surat Rekomendasi Paspor**:
   - Untuk pembuatan Surat Rekomendasi Paspor (`template.slug === "rekom-paspor"` atau template ber-prefix rekomendasi paspor), sistem menerapkan aturan wajib minimal 2 suku kata nama pada nama pemohon/jamaah.
   - **Apapun perihal pembuatan surat rekom paspornya** (baik perihal reguler maupun perihal endorsement):
     - Lakukan pengecekan jumlah suku kata nama hasil ekstrak KTP (setelah normalisasi spasi dan penyaringan gelar).
     - **Jika nama KTP memiliki 1 suku kata (< 2 kata)**:
       - Sistem secara otomatis mengambil nama ayah kandung dari hasil OCR/manual data dokumen **Akta Kelahiran** atau **Kartu Keluarga (KK)** (memilih salah satu data ayah yang tersedia), lalu menggabungkannya ke nama jamaah menggunakan fungsi `formatJamaahNameWithEndorsement` sehingga nama pemohon menjadi minimal 2 suku kata (misal: *"Siti"* + ayah *"Ahmad"* -> *"Siti Ahmad"*).
       - **Apabila data ayah tidak ditemukan di KK maupun Akta**: Sistem mengizinkan admin menambahkan kata/nama ayah secara manual di kolom isian nama atau kolom nama ayah.
     - **Jika nama KTP sudah memiliki 2 suku kata atau lebih (>= 2 kata)**:
       - Sistem menggunakan nama dari KTP secara langsung dan **tidak perlu** mengambil/menambahkan nama ayah dari KK/Akta (kecuali perihal surat secara eksplisit adalah *Endorsement* nama 3 suku kata).

2. **Prinsip Prioritas Tertinggi Input/Revisi Manual Admin (Manual Override Priority)**:
   - Hasil ekstraksi OCR adalah referensi utama pengisian awal (*initial baseline autofill*), **BUKAN pemblokir revisi manual**.
   - Setiap ketikan, tambahan kata, atau koreksi yang dimasukkan oleh staf admin pada kolom input form berstatus **Prioritas Tertinggi (Highest Priority Override)**.
   - Sistem **dilarang keras menimpa balik (overwrite)** ketikan manual admin dengan data OCR lama saat template berpindah atau komponen re-render.
   - Ketika admin mengedit nama pada salah satu field, sistem secara cerdas menyinkronkan nilai revisi tersebut ke seluruh alias placeholder nama (`nama`, `nama_lengkap`, `Nama Jama'ah`, dll.) sehingga hasil surat Word (.docx) dan PDF dijamin memuat ketikan revisi admin tersebut.

3. **Resolusi Sumber Data Nama Ayah**:
   - Prioritas pemilihan data ayah kandung pemegang KTP:
     1. **Manual Form Input / Revision Admin** (jika admin mengetikkan langsung di input form).
     2. Field profil jamaah terdaftar (`jamaah.namaAyah`, `jamaah.ayahKandung`, `jamaah.fatherName`).
     3. Baris anggota keluarga jamaah di Dokumen KK (berdasarkan kecocokan NIK/Nama jamaah).
     4. Dokumen **Akta Kelahiran** (`jenis === "akta"`) baik dari `ocrData.namaAyah` maupun `manualData.namaAyah`.
     5. Dokumen **Kartu Keluarga** (`jenis === "kk"`) baik dari `ocrData.namaAyah` maupun `manualData.namaAyah`.
     6. Fallback `namaKepalaKeluarga` dari KK jika relevan.

4. **Sinkronisasi Antara UI Form Surat & Autocrat Engine**:
   - Perubahan diimplementasikan pada:
     - `src/shared/lib/surat-autocrat-engine.ts`:
       - Menambahkan pengecekan dokumen jenis `"akta"` pada resolver fallback `namaAyahCandidate`.
       - Menambahkan logika deteksi suku kata nama (< 2 kata) pada template rekomendasi paspor untuk trigger penggabungan nama ayah otomatis.
       - Memastikan nilai `manualFormData` yang telah diedit admin tidak diganti secara paksa oleh resolver manifest.
     - `src/app/admin/surat/page.tsx`:
       - Menyesuaikan `handleUpdateFieldValue` agar perubahan ketikan nama oleh admin otomatis memperbarui seluruh placeholder alias nama dan tidak tertimpa ulang oleh `useEffect` OCR.
       - Menjaga flag *user-modified* agar `applyAllOcrResultsToForm` tidak mereset input yang sudah disesuaikan secara manual oleh admin.

## Consequences
- Surat Rekomendasi Paspor terjamin memenuhi standar regulasi Keimigrasian RI secara otomatis (minimal 2 suku kata).
- Alur kerja staf admin menjadi fleksibel dan tidak kaku: staf admin tetap memegang kendali penuh atas hasil akhir teks surat apabila OCR salah membaca atau tidak lengkap.
- Tidak ada lagi kendala ketikan admin yang hilang atau tertolak saat menggunakan mode sumber data OCR.
- Tidak ada perubahan skema database Prisma (backward compatible).
