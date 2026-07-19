# Deployment Environment Guide

Dokumen ini menjelaskan struktur environment, arsitektur build, dan tata cara deployment aplikasi VTU Admin, khususnya sehubungan dengan konfigurasi *Next.js Standalone Build* dan *Prisma Database connection*.

---

## 1. Environment Typology

Aplikasi menggunakan tiga tingkatan environment:

### A. Development Environment
- **Tujuan**: Local development oleh engineer.
- **Karakteristik**: Berjalan via `npm run dev`.
- **Database**: Terhubung ke database lokal atau development remote database.
- **Environment Variables**: Next.js secara otomatis memuat file `.env.local` atau `.env`.

### B. Preview Environment
- **Tujuan**: Validasi integrasi (UAT, QA, PO Sign-off) sebelum naik ke Production.
- **Karakteristik**: 
  - Dibangun dengan production build mode (`npm run build`).
  - Deploy via Vercel Preview URL atau Staging Docker environment.
- **Database**: Branch terpisah atau skema tersendiri di Supabase.

### C. Production Environment
- **Tujuan**: End-user environment.
- **Karakteristik**: Stable, highly available. Menggunakan `output: "standalone"` untuk efisiensi container image.
- **Database**: Main production database di Supabase.

---

## 2. Next.js Standalone Build

Aplikasi ini dikonfigurasi untuk menghasilkan Standalone Build di `next.config.mjs` (`output: "standalone"`).
Mode ini sangat efisien untuk Docker karena hanya menyertakan file-file (termasuk `node_modules` tertentu) yang benar-benar digunakan.

### Perilaku Environment Variables (Knowledge Gap)
Selama UAT, ditemukan *knowledge gap* di mana server lokal yang dijalankan via `node .next/standalone/server.js` gagal melakukan autentikasi (Prisma error) karena database tidak terhubung.

**Penyebab:**
- Secara bawaan, build output `.next/standalone/server.js` **TIDAK** memuat (load) file `.env`.
- Next.js berasumsi bahwa dalam *containerized environment* (seperti Docker atau Kubernetes) atau *Managed Serverless* (seperti Vercel), environment variables disuntikkan secara dinamis oleh *host* ke dalam `process.env`.
- Karena file `.env` tidak termuat, `DATABASE_URL` bernilai `undefined`, memaksa Prisma *fallback* ke `127.0.0.1:5432` yang menyebabkan koneksi ditolak.

**Solusi yang Benar:**
Saat menguji standalone build secara lokal (tanpa Docker), environment variable harus diberikan ke proses Node secara eksplisit.
Mulai dari Node v20+, Node mendukung argumen `--env-file`:
```bash
node --env-file=.env .next/standalone/server.js
```
Alternatif lain adalah menggunakan package `dotenv-cli` atau mengatur export pada shell.

---

## 3. SOP Menjalankan Standalone Build (Local / Bare Metal)

Jika Anda harus mendeploy / menguji build standalone secara manual, ikuti langkah berikut:

### Langkah 1: Production Build
Pastikan Prisma generate dan build Next.js dijalankan.
```bash
npx prisma generate
npm run build
```

### Langkah 2: Copy Static Files (Opsional untuk testing murni)
Next.js tidak menyertakan folder `public` dan `.next/static` ke dalam folder standalone secara default (mereka biasanya dilayani via CDN/Nginx). Untuk local testing, Anda harus menyalinnya:
```bash
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

### Langkah 3: Eksekusi Server
Pilih salah satu metode berikut untuk menjalankan server.

**Opsi A: Node.js Native Env (Node v20+)**
```bash
node --env-file=.env .next/standalone/server.js
```

**Opsi B: Menggunakan dotenv (Jika terinstall)**
```bash
node -r dotenv/config .next/standalone/server.js
```

**Opsi C: Environment Variables Host (Docker/Linux)**
```bash
export DATABASE_URL="postgresql://..."
export NEXTAUTH_SECRET="secret..."
node .next/standalone/server.js
```

---

## 4. Docker & CI/CD Deployment

Dalam deployment otomatis:
1. CI pipeline akan menjalankan `prisma migrate deploy` (Sangat krusial untuk mencegah Schema Drift!).
2. Pipeline akan membangun Docker Image yang menyalin hasil `standalone` beserta folder `public` & `static`.
3. CD platform (mis. AWS ECS, Vercel, dll) akan menyuntikkan (inject) Environment Variables dari *Secret Manager* secara langsung. **Tidak ada file `.env` di dalam docker image production.**
