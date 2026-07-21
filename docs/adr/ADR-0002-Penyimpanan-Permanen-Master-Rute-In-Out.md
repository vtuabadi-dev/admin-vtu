# ADR-0002: Perubahan Skema Database untuk Master Rute dan Registry Folder Google Drive

## Status
PROPOSED

## Tanggal
2026-07-20

## Konteks
Aplikasi VTU Operasional membutuhkan peningkatan pada dua area utama yang berdampak pada skema database:
1. **Master Rute In-Out**: Saat ini disimpan di memory lokal client secara sementara. Diperlukan tabel permanen di database agar rute yang dimasukkan admin dapat disimpan secara permanen.
2. **Registry Folder Google Drive**: Untuk menata berkas jamaah secara rapi sesuai keberangkatan dan grup, aplikasi harus membuat struktur folder bertingkat di Google Drive (Keberangkatan → Grup → Jamaah). Agar proses upload cepat dan tidak perlu berulang kali mencari folder ID menggunakan API pencarian Drive, sistem membutuhkan kolom penyimpanan (registry) untuk merekam Folder ID Google Drive langsung pada entitas keberangkatan terkait.

## Opsi yang Dipertimbangkan
- **Opsi A**: Melakukan query dinamis ke API Google Drive untuk mencari folder setiap kali ada upload berkas, dan membiarkan Master Rute di memory client.
  *Trade-off*: Sangat lambat dan membebani batas kuota API Google Drive karena harus mencari folder di setiap upload. Rute juga akan terus terhapus jika halaman direfresh.
- **Opsi B (Rekomendasi)**:
  * Membuat tabel database baru `MasterRoute` untuk merekam rute in-out secara permanen.
  * Menambahkan kolom `driveFolderIds` tipe `Json?` pada model `Keberangkatan` untuk bertindak sebagai registry pencatatan Folder ID Google Drive.
  *Trade-off*: Memerlukan migrasi skema database (`npx prisma db push`), namun menyelesaikan kedua masalah secara bersih, aman, dan meningkatkan performa I/O berkas secara signifikan.

## Keputusan
Memilih **Opsi B**. Kami akan mendefinisikan model `MasterRoute` dan menambahkan kolom `driveFolderIds` pada model `Keberangkatan` di Prisma schema.

## Konsekuensi
- Positif:
  * Rute In-Out tersimpan permanen di database.
  * Proses upload dokumen jamaah menjadi lebih cepat karena ID folder Google Drive langsung diambil dari kolom `driveFolderIds` di database tanpa melakukan API search call terlebih dahulu.
- Negatif:
  * Memerlukan migrasi skema database (`npx prisma db push`).
