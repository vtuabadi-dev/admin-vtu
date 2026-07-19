# Deployment Checklist

Dokumen ini berisi daftar verifikasi wajib sebelum dan sesudah melakukan rilis (deployment) aplikasi VTU Admin ke lingkungan Staging/Preview maupun Production.

---

## 1. Pre-Deployment Configuration (Environment)
Pastikan seluruh credentials dan variable disuntikkan (injected) dengan benar di host / CI-CD pipeline.

- [ ] `DATABASE_URL` tersedia (Connection string utama / pooler untuk queries).
- [ ] `DIRECT_URL` tersedia (Connection string direct digunakan untuk Prisma Migrations).
- [ ] `NEXTAUTH_SECRET` tersedia (Secret key untuk enkripsi session NextAuth).
- [ ] `NEXTAUTH_URL` tersedia (Sesuai dengan domain environment target).
- [ ] `NODE_ENV` bernilai `production`.

## 2. Build & Database Synchronization
Proses CI/CD harus menjalankan tahapan ini secara berurutan.

- [ ] **Database Migration:** `npx prisma migrate deploy` dijalankan pada build pipeline untuk menerapkan perubahan schema.
- [ ] **Prisma Client:** `npx prisma generate` berhasil men-generate Prisma Client sesuai schema terbaru.
- [ ] **Next.js Build:** `npm run build` berhasil tanpa fatal error (Type checking & Linting passed).

## 3. Post-Deployment Verification (Smoke Test)
Setelah container atau server running, verifikasi langsung terhadap aplikasi.

- [ ] Aplikasi merespons di root domain (tidak ada 502 Bad Gateway).
- [ ] Halaman Login memuat assets (CSS/JS) dengan benar (tidak ada HTTP 404 pada public assets).
- [ ] **Login Berhasil:** Autentikasi bekerja dengan normal (membuktikan `DATABASE_URL` terhubung dan `NEXTAUTH_SECRET` valid).
- [ ] **Dashboard Berhasil:** Data analitik/tampilan utama berhasil dimuat (membuktikan Prisma query bekerja).
- [ ] **CRUD Berhasil:** Uji fungsional Tambah, Edit, List, dan Hapus (Delete) pada salah satu modul utama (misalnya Master Airline / Keberangkatan) tidak menghasilkan Prisma Runtime Error (HTTP 500).

## 4. Final Sign-off
- [ ] Tidak ada regresi ditemukan.
- [ ] Product Owner Approval didapatkan.
- [ ] Tag versi di Git di-push (misal `v1.2.0`).
