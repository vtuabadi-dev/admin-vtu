# Development Environment Standard

## Environment Variable Policy
Pengelolaan Environment Variable pada VTU ABADI Enterprise Travel Management System mengacu pada prinsip 12-Factor App. Semua kredensial, konfigurasi database, dan secret API harus disuntikkan melalui environment variable. Dilarang melakukan hardcode konfigurasi apa pun di dalam source code, terutama informasi yang berkaitan dengan Supabase, Google Vision API, dan kredensial eksternal lainnya.

## .env
File `.env` merupakan konfigurasi utama (basis) yang digunakan sebagai referensi atau template, serta menyimpan environment variables default untuk local development dan Docker. File ini memuat `DATABASE_URL` yang mengarah pada Supabase PostgreSQL, yang akan digunakan sebagai basis koneksi untuk environment lain.
Semua koneksi Supabase di `.env` (atau `.env.example`) di-commit ke dalam repository untuk memudahkan discovery (kecuali jika mengandung Production Secret, maka digunakan dummy text atau referensi ke secret manager).

## .env.local
File `.env.local` digunakan secara eksklusif untuk Local Development Environment (development di mesin lokal setiap engineer). File ini meng-override variabel yang dideklarasikan di `.env`.
Di sinilah letak konfigurasi spesifik developer, termasuk `DATABASE_URL` Supabase (menggantikan localhost PostgreSQL). File ini masuk ke `.gitignore` sehingga tidak akan dikommit.

## Environment Override Rules
Next.js dan Prisma membaca environment variables dengan hirarki prioritas sebagai berikut:
1. `process.env` (di-set saat run command)
2. `.env.local` (Local overrides)
3. `.env.development` / `.env.production` (Environment specific)
4. `.env` (Base defaults)

Setiap nilai yang ada di `.env.local` secara otomatis menimpa (override) nilai pada `.env`.

## Supabase Development
Environment Development untuk Supabase menggunakan project khusus Development.
Developer terhubung langsung via `DATABASE_URL` dengan `pgbouncer=true` dan port `6543`.
Migrations dijalankan menggunakan `DIRECT_URL` (koneksi langsung, port `5432`) untuk mencegah masalah pooler.
Tidak diperbolehkan menggunakan Localhost PostgreSQL (127.0.0.1) untuk memastikan konsistensi fungsi Supabase seperti Auth, Edge Functions, dan pg_vector di lingkungan tim.

## Supabase Preview
Lingkungan Preview digunakan oleh Vercel (atau environment CI/CD lainnya) saat Pull Request. Database yang digunakan adalah Supabase project tersendiri atau branch Supabase yang berisi snapshot struktur tanpa data asli Production. Konfigurasi diberikan melalui environment variables di platform CI/CD.

## Supabase Production
Lingkungan Production sangat terlarang bagi koneksi lokal. `DATABASE_URL` hanya boleh diset dalam secret manager Production (misal: Vercel Environment Variables). Developer dilarang keras menaruh kredensial Production di dalam file `.env` atau `.env.local`.

## Prisma Environment
Prisma CLI dan Client membaca environment configuration dari `DATABASE_URL` dan `DIRECT_URL`.
Pastikan seluruh eksekusi `npx prisma db push` atau `npx prisma migrate deploy` dapat membaca environment override yang tepat (`.env.local` di mesin dev).

## Security & Secret Policy
- Rahasia tingkat tinggi seperti `AUTH_SECRET`, kredensial Supabase Production, dan Private Key eksternal tidak boleh disimpan di `.env.example` maupun dikommit ke git.
- Gunakan key dummy untuk `.env` jika file tersebut dikommit.
- Pelanggaran keamanan yang mengekspos API key harus dilaporkan sebagai insiden Security.

## Developer Onboarding
1. Clone repository VTU ABADI.
2. Salin `.env` (atau `.env.example`) ke `.env.local`: `cp .env .env.local`.
3. Sesuaikan `DATABASE_URL` menggunakan kredensial Supabase Development yang diberikan oleh Lead / DevOps.
4. Pastikan `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, dan variabel lain menggunakan referensi ke Supabase.
5. Jalankan `npm install`.
6. Jalankan `npm run dev`.

## Troubleshooting
- **Can't reach database server / 127.0.0.1:5432 Error**:
  Root cause ini terjadi jika `.env.local` masih mengarah ke localhost. Buka `.env.local` dan ganti seluruh referensi `127.0.0.1` ke koneksi Supabase Development yang sesuai.
- **Prisma: Connection limit exceeded**:
  Pastikan `DATABASE_URL` menggunakan port `6543` dengan penanda `?pgbouncer=true` untuk connection pooling, sedangkan `DIRECT_URL` menggunakan `5432`.
- **Environment Not Loaded**:
  Restart development server. Next.js cache kadang tidak memuat `.env.local` jika di-update secara on-the-fly. Hentikan server dengan `Ctrl + C` dan jalankan ulang `npm run dev`.
