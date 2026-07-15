# Performance Governance

Dokumen ini memuat standar kinerja aplikasi (performance standards) yang ditargetkan dan metodologi optimasi untuk memenuhi Service Level Objective (SLO).

## 1. Query Optimization
Setiap interaksi dengan Prisma wajib memperhatikan efisiensi. Jangan gunakan `.findMany()` tanpa klausa seleksi limit jika dataset berpotensi masif. Pilihan indeks pada kolom (sebagaimana tercantum di Database Governance) memegang peran krusial pada efisiensi query.

## 2. N+1 Prevention
Pengambilan data berelasi di GraphQL atau REST API dilarang memicu masalah *N+1 Queries*.
- Gunakan fitur `include` pada Prisma untuk eagerly fetch relasi dalam level SQL Joins.
- Jika inklusi tidak memungkinkan, gunakan pola Data Loader untuk melakukan *batching* kueri.

## 3. Pagination Policy
Seluruh endpoint API yang me-return sebuah kumpulan data list/array (Collection) **WAJIB** menerapkan struktur Paginated.
- Jika data dikonsumsi UI untuk Data Table, gunakan Limit-Offset Pagination.
- Jika data dikonsumsi feed atau infinite scroll (skala besar), diutamakan menggunakan Cursor-based Pagination.

## 4. Cache Policy
Strategi *caching* diterapkan untuk respon yang jarang berubah tetapi memiliki biaya pembacaan (*read cost*) yang mahal.
- Next.js Data Cache dan Full Route Cache dapat digunakan pada aplikasi publik.
- Pada area internal/admin yang realtime, gunakan *Stale-While-Revalidate* (SWR) atau React Query untuk caching client-side.
- Selalu evaluasi strategi in-validation (kapan cache kedaluwarsa).

## 5. Connection Pool
Koneksi Prisma di lingkungan Serverless / Vercel wajib terhubung melalui Supabase Pooler (`pgbouncer=true`) dan memanfaatkan connection pooling agar DB tidak kehabisan thread koneksi. File konfigurasi harus mendefinisikan `connection_limit` yang rasional terhadap skala beban.

## 6. Memory Usage
Hindari mengalokasikan string besar dalam memori node atau memanipulasi *Buffer* berskala masif. Pemrosesan file (upload document / export CSV) sebaiknya diatur ke dalam mekanisme *Streaming* alih-alih me-load seluruh file ke dalam RAM secara bersamaan.

## 7. Performance Budget
Tentukan sebuah Performance Budget yang ketat untuk ukuran bundle (JavaScript frontend).
- Penggunaan library besar (contoh: moment.js, lodash secara utuh) yang menambah bundle size dilarang.
- Fitur tidak esensial atau komponen besar harus di-*lazy load* (Code Splitting).

## 8. Performance Review Checklist
Dalam Code Review, pertanyaan-pertanyaan performa berikut wajib divalidasi:
- [ ] Apakah kueri ini rentan N+1?
- [ ] Apakah pagination tersedia pada response?
- [ ] Apakah operasi data massal (Bulk) menggunakan pola batch transaction / `createMany` / `updateMany`?
- [ ] Apakah file upload di-stream dengan aman?
- [ ] Apakah *bundle size* client terpengaruh signifikan oleh library baru?
