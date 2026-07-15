# Build Hygiene Policy

Dokumen ini mendefinisikan kebijakan kebersihan proses build (Build Hygiene) yang wajib dipatuhi dalam pengembangan aplikasi. Kebijakan ini bersifat framework-agnostic dan berlaku untuk Next.js, React, Vite, Node.js, NestJS, Express, maupun future framework lainnya.

## General Principles
*   Dilarang keras menyisakan **Build Artifacts** dari proses build sebelumnya saat melakukan clean build.
*   Seluruh dependensi harus berada dalam state yang konsisten sebelum proses build dimulai.

## Engineering Build Order

Berikut adalah urutan wajib dalam melakukan build dan verifikasi:

1.  **Install Dependencies**
    *Tujuan*: Memastikan seluruh dependensi terunduh dan terinstal sesuai dengan definisi dan lockfile, sehingga menghindari ketidakcocokan versi paket.
2.  **Generate Client / Generated Code**
    *Tujuan*: Membuat atau memperbarui kode hasil generate (seperti Prisma Client, GraphQL codegen, atau protokol buffer) agar sinkron dengan skema terbaru.
3.  **Type Check**
    *Tujuan*: Memvalidasi seluruh tipe statis di seluruh codebase untuk mendeteksi error pada level kompilasi sebelum aplikasi berjalan.
4.  **Production Build**
    *Tujuan*: Menghasilkan **Build Artifacts** akhir yang siap dijalankan di production, lengkap dengan optimasi (minifikasi, tree-shaking, bundle splitting).
5.  **Development Run**
    *Tujuan*: Menjalankan aplikasi dalam mode pengembangan untuk memastikan semua fitur berjalan normal di lingkungan lokal developer.
6.  **Functional Verification**
    *Tujuan*: Menguji dan memastikan bahwa fitur-fitur dan alur bisnis aplikasi berfungsi sesuai spesifikasi.
