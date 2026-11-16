# Audit UI, fetching, render, dan regresi — 16 November 2026

## Status dan batas pemeriksaan

Perbaikan pada navigasi, inisialisasi dashboard, intro, dan daftar jamaah telah dibuat di working tree. Belum ada commit atau deployment. Pemeriksaan ini **belum merupakan kelulusan seluruh alur bisnis**.

Chrome sungguhan digunakan melalui Playwright, dengan viewport desktop 1440 × 1000 dan mobile 390 × 844. Pengujian tidak mengirim pendaftaran, pembayaran, pesan, ataupun perubahan data operasional.

Server lokal awalnya gagal membuka TLS dalam sandbox. Di luar sandbox, server Next.js kemudian menerima penolakan autentikasi database. Pemeriksaan lanjutan menemukan karakter `$` literal pada password ditafsirkan sebagai ekspansi environment. Escaping diperbaiki **hanya di `.env.local`**, tanpa mengganti password. Hasil parsing Next.js diverifikasi sama dengan kredensial literal, dan query baca jumlah tabel diterima: 7 user, 33 jamaah, 27 paket. URL autentikasi localhost disetel hanya pada environment proses pengujian; autentikasi maupun URL produksi dalam source tidak diubah. Mekanisme akun demo yang sudah ada tidak diubah, dan pemeriksaan ini tidak membuktikan otorisasi semua peran.

## Evidence Used

| ID | Evidence | Tier |
| --- | --- | --- |
| E-001 | Source awal dan git diff pada `src/shared/gsap/GSAPProvider.tsx` | 1 |
| E-002 | Source awal dan git diff dashboard, splash, serta operational store | 1 |
| E-003 | Source awal dan git diff intro serta login; error hydration pada pengujian awal Chrome | 1 |
| E-004 | Source awal dan git diff halaman jamaah | 1 |
| E-005 | Log Vitest `temp/ui-audit-suite.log` dan `temp/ui-audit-jamaah-tests.log` | 1 |
| E-006 | Hasil Chrome `temp/browser-audit/routes.json` beserta screenshot halaman | 1 |
| E-007 | Hasil interaksi Chrome `temp/browser-audit/public-interactions.json` | 1 |
| E-008 | Log server `temp/ui-audit-server.log`: database authentication failed | 1 |
| E-009 | Log pemeriksaan tipe `temp/ui-audit-types.log` dan lint `temp/ui-audit-lint.log` | 1 |
| E-010 | Log build produksi `temp/ui-audit-build.log` | 1 |
| E-011 | `temp/ui-audit-environment.json`, perbandingan nilai environment tanpa mencetak rahasia, dan hasil query baca tabel pada terminal | 1 |
| E-012 | Source `src/app/api/migrate-terms/route.ts`, error SQL saat prerender build awal, dan hasil build setelah penambahan `force-dynamic` | 1 |
| E-013 | `temp/browser-audit/business-entry.json`, `jamaah-final.png`, dan `invoice-tambah-jamaah.png` | 1 |

Artefak `temp/` merupakan bukti lokal yang diabaikan Git. Jangan membagikan `session.json`, karena berisi sesi browser pengujian.

## Root causes dan perubahan

| Temuan | Confidence Level | Evidence Used | Perbaikan | Decision Gate |
| --- | --- | --- | --- | --- |
| Transisi menyembunyikan seluruh root sebelum `router.push`; pemulihan bergantung pada perubahan pathname. Perubahan query pada pathname sama berisiko meninggalkan root transparan. Interceptor global juga mengambil alih navigasi link. | CONFIRMED | E-001, E-007 | Gunakan navigasi Next Link, pertahankan halaman saat tujuan disiapkan, dan tambahkan route loading skeleton. Ctrl+klik diverifikasi membuka tab lain. | Proceed Coding |
| Splash dan dashboard menjalankan pengambilan data awal yang tumpang tindih; data utama tertahan sampai analitik semua paket selesai. | CONFIRMED | E-002, E-005, E-006 | Satukan permintaan inti yang sedang berjalan dan tampilkan snapshot utama sebelum analitik. Analitik berjalan di latar belakang dengan konkurensi terbatas dan status loading. Refresh inti setelah edit tidak menunggu analitik lama; hasil analitik lama tidak menimpa hasil refresh terbaru. | Proceed Coding |
| Status global dapat dianggap selesai meskipun permintaan data inti gagal. | CONFIRMED | E-002, E-005 | Validasi respons statistik dan keberangkatan; simpan error agar halaman dapat menawarkan retry. Pertahankan kontrak pemuat yang tidak melempar rejection ke pemanggil lama. | Proceed Coding |
| Pembacaan storage pada render awal membuat intro berbeda antara server dan browser. | CONFIRMED | E-003, E-006, E-007 | Pindahkan pembacaan storage ke effect dan tangani event intro yang selesai sebelum listener login dipasang. | Proceed Coding |
| Splash memaksa jeda minimal 2,5 detik serta menggunakan timer tanpa cleanup. | CONFIRMED | E-002 | Hilangkan jeda buatan, lindungi akses storage, dan abaikan penyelesaian setelah unmount. Desain splash dipertahankan. | Proceed Coding |
| Daftar jamaah mengubah kegagalan menjadi array kosong; tombol tambah lama tidak sesuai jalur penambahan yang ditetapkan pengguna. | CONFIRMED | E-004, E-005, instruksi pengguna | Tampilkan error dan retry, pertahankan data terakhir ketika refresh gagal, abaikan hasil permintaan lama, dan hapus tombol tambah usang dari Semua Jamaah. | Proceed Coding |
| Prewarmer global mengambil halaman admin, gambar portal, dan API publik secara eager, termasuk ketika berada di portal admin. | CONFIRMED | E-002, source `PortalBackgroundPrewarmer.tsx` | Batasi warming ke portal publik saat browser idle dan hapus permintaan API yang hasilnya tidak digunakan. | Proceed Coding |
| Next.js mengekspansi karakter `$` pada password URL database di `.env.local`. Nilai hasil parsing berbeda dari nilai literal; koneksi literal diterima. | CONFIRMED | E-008, E-011 | Escape karakter tersebut pada konfigurasi lokal; verifikasi nilai hasil parsing identik dengan kredensial asli. | Proceed Coding |
| Endpoint migrasi sementara dapat dicoba oleh static prerender build. | CONFIRMED | E-012 | Tandai route sebagai `force-dynamic` agar build tidak mengeksekusinya. Isi SQL dan perilaku bisnis tidak diubah. Endpoint tidak dipanggil oleh skrip tes browser. | Proceed Coding |

Patch tidak mengubah definisi schema, aturan pembayaran, autentikasi, otorisasi, atau bentuk kontrak API publik. Build awal mengungkap percobaan menjalankan endpoint migrasi lama; patch mencegah percobaan otomatis tersebut pada build berikutnya. Ini tidak boleh diartikan sebagai klaim bahwa tidak ada kode migrasi lama yang pernah dieksekusi oleh build awal.

## Dampak terhadap alur bisnis

- Login tetap memakai mekanisme dan peran yang sama. Perubahan hanya menyangkut render intro serta konfigurasi koneksi lokal.
- Tombol tambah usang di Semua Jamaah dihapus. **Pendaftaran rombongan baru tetap melalui form pendaftaran. Tambah Jamaah pada Manajemen Invoice → Create Invoice hanya menambah anggota baru ke rombongan yang sudah terdaftar.** Tidak ada jalur registrasi baru yang ditambahkan, dan kategori invoice ini tidak dipakai untuk membuat rombongan baru.
- Aturan tagihan, nominal, alokasi pembayaran, status pelunasan, dokumen wajib, persetujuan, manifest, dan pembagian kamar tidak diubah.
- Loading, kegagalan fetching, dan retry menjadi lebih jelas. Perubahan yang terlihat pengguna berada pada presentasi data dan navigasi.
- Tidak ada pengiriman pendaftaran, pembayaran, pesan, ataupun perubahan data operasional melalui skrip browser.

## Verifikasi Chrome

Halaman admin yang diperiksa mencakup dashboard, jamaah, Manajemen Invoice, keberangkatan, dokumen, monitoring pembayaran, manifest, rooming, laporan, dan pengaturan. Pengujian awal juga membuka halaman registrasi manual lama, tetapi halaman tersebut tidak dijadikan pintu masuk penambahan jamaah. Pembukaan route **tidak berarti transaksi berhasil**. Pengamatan awal saat konfigurasi koneksi salah mencakup loading, error database, dan state kosong; hasil final harus dibaca bersama hasil pengujian setelah koneksi diperbaiki.

Portal mobile yang dibuka: login, pendaftaran umroh, badal umroh, wakaf Quran, serta pelacakan badal/wakaf. Pemeriksaan interaksi lanjutan juga memverifikasi:

- Intro dapat dilewati dan field login dapat digunakan.
- Toggle password tampil/sembunyi.
- Reload untuk pengguna yang sudah melewati intro tidak menghasilkan page error.
- Pergantian tab Login Admin / 4 Portal Publik.
- Ctrl+klik membuka pendaftaran dalam tab baru dan mempertahankan tab asal.
- Klik biasa membuka halaman pendaftaran.
- Form kosong menampilkan validasi nama perwakilan tanpa mengirim pendaftaran.
- Tidak ada overflow horizontal root atau page error pada rangkaian interaksi tersebut.
- Pemeriksaan final E-013 memastikan tombol lama tidak ada di Semua Jamaah dan kategori Tambah Jamaah tetap bisa dibuka dalam Create Invoice. Tidak ada form invoice yang disubmit dalam pemeriksaan ini.

## Pemeriksaan regresi

- Setelah dependency dipulihkan sesuai lockfile: **31 file, 328 tes lulus**. Termasuk tes pemuat data, tidak adanya tombol tambah usang di Semua Jamaah, pemulihan error melalui retry, data utama yang siap sebelum analitik, dan refresh saat analitik sebelumnya masih berjalan.
- Pemasangan awal alat browser sempat mengubah versi dependency lokal tanpa mengubah manifest atau lockfile. `npm ci` memulihkan dependency aplikasi; perbandingan seluruh dependency langsung terhadap lockfile tidak menemukan perbedaan. Playwright dipisahkan ke `temp/browser-tools`.
- TypeScript dan lint diperiksa; lint masih memuat warning yang perlu dibaca pada E-009.
- Build produksi final lulus dengan **exit code 0**, termasuk kompilasi serta pemeriksaan tipe. Pemeriksaan sintaks skrip browser dan `git diff --check` juga lulus.

Tes otomatis memakai mock untuk kegagalan/sukses fetching yang terkontrol. Tes tersebut bukan pengganti pengujian transaksi dengan database staging.

## Pekerjaan yang masih memerlukan bukti tambahan

1. Jalankan pengujian transaksi memakai database staging/fixture terisolasi untuk pendaftaran → jamaah → dokumen → invoice → pembayaran → manifest → rooming → laporan. Pengujian baca pada database yang tersedia tidak membuktikan seluruh transaksi tersebut.
2. Modul dokumen, monitoring pembayaran, dan rooming masih dapat menampilkan state kosong ketika API gagal. Perilaku ini diamati saat konfigurasi database salah dan didukung pemeriksaan source. Belum diperbaiki di patch ini; jangan menganggap angka nol pada kondisi database gagal sebagai data valid.
3. Uji hak akses setiap peran, perubahan filter paket dengan cepat, refresh saat data berubah, pemulihan koneksi, upload/download, serta hasil ekspor setelah database tersedia.
4. Ukur performa dengan production build dan dataset representatif. Durasi dev server yang mencakup kompilasi tidak digunakan sebagai klaim peningkatan performa produksi.

## Evidence Summary

- **Evidence Collected:** E-001–E-013.
- **Evidence Tier:** 1, source, git diff, hasil tes, log runtime, screenshot dan browser.
- **Confidence Level:** CONFIRMED untuk temuan source/runtime yang dirinci di tabel. Tidak ada klaim semua alur bisnis bebas regresi.
- **Implementation Recommendation:** Proceed Coding untuk perubahan yang dirinci; Waiting Additional Evidence untuk kelulusan pengujian seluruh alur bisnis dengan database staging.
