# Deployment Troubleshooting Guide

Dokumen ini adalah pedoman (playbook) untuk menangani kendala (incident) yang terjadi selama atau pasca deployment aplikasi.

---

## 1. Common Deployment Mistakes

Berikut adalah beberapa kesalahan umum yang sering menjadi penyebab kegagalan aplikasi pasca deployment:

- **Lupa `prisma migrate deploy`**: Menyebabkan Schema Drift. Aplikasi akan mengalami runtime error (`column does not exist`, dsb) karena kode baru mencari tabel/kolom yang belum diciptakan di database production.
- **Lupa `prisma generate`**: Aplikasi tidak mengenali fungsi atau model Prisma yang baru ditambahkan ke source code.
- **Lupa Inject Env Variables**: Aplikasi gagal berjalan, Prisma gagal terkoneksi, atau NextAuth menolak seluruh sesi login (`NEXTAUTH_SECRET` null).
- **Wrong `DATABASE_URL`**: Sengaja maupun tidak sengaja mengarahkan production build ke development database, atau sebaliknya.
- **Stale Build Cache**: Next.js Data Cache yang mengembalikan versi lama dari suatu halaman/route.
- **Standalone Static Files Missing**: Pada environment non-Docker, lupa melakukan copy `.next/static` dan `public` menyebabkan UI aplikasi memuat halaman blank (CSS/JS 404).

---

## 2. Decision Tree Deployment (Incident Flow)

Gunakan alur berikut untuk mengisolasi akar penyebab (Root Cause) ketika deployment bermasalah.

```mermaid
graph TD
    A[Deployment Bermasalah] --> B{Fase Kegagalan?}
    B -->|Build Time| C[Build Gagal]
    B -->|Run Time| D[Runtime / App Gagal]

    C --> C1[Periksa Build Logs]
    C1 --> C2[Cek TypeScript/Lint Error]
    C1 --> C3[Cek Prisma Generate Error]

    D --> D1{Jenis Runtime Error?}
    
    D1 -->|Gagal Start (Crash)| D2[Periksa Environment Variables]
    D2 --> D2A[Apakah DATABASE_URL terbaca?]
    D2 --> D2B[Apakah NEXTAUTH_URL & SECRET terbaca?]
    
    D1 -->|Gagal Operasi (HTTP 500)| D3[Periksa Database / Migration]
    D3 --> D3A[Apakah migration terbaru sudah jalan di _prisma_migrations?]
    D3 --> D3B[Apakah ada Schema Drift?]
    
    D1 -->|Aplikasi Blank / 404 Assets| D4[Periksa Build Output]
    D4 --> D4A[Apakah static files / public assets tersalin ke folder container?]

    D3A -->|Migration Missing| D5[Jalankan Recovery Hotfix Migration]
    D3A -->|Data Tidak Konsisten| D6[Periksa Source Code / Business Logic]
```

---

## 3. Immediate Recovery Action

Jika terjadi Runtime Error kritis sesaat setelah deployment (terutama terkait Database Mismatch):

1. **JANGAN Langsung Mengubah Schema.prisma** tanpa investigasi.
2. **Audit Database Production:** Verifikasi struktur tabel langsung di database dan tabel `_prisma_migrations`.
3. **Rollback vs Fix Forward:** 
   - Jika data terkorupsi, lakukan rollback ke tag commit sebelumnya dan restore database.
   - Jika murni *missing migration* yang bersifat additive, jalankan `prisma db push` atau apply migration yang hilang tanpa merusak struktur existing.
4. **Laporkan RCA (Root Cause Analysis)** sesuai dengan Engineering Evidence Standard (EES).
