# ADR-0023: Implementasi Sinkronisasi Data Realtime Menggunakan Supabase Realtime (WebSocket CDC) & Hybrid Event Bus

## Status
APPROVED (Product Owner Approved via Consultation)

## Tanggal
2026-10-05

## Domain
Realtime Infrastructure, State Synchronization, Multi-Client Collaboration, WebSocket CDC, Event Bus

## Baseline
EEOS Governance Baseline v1.2

---

## 1. Konteks & Permasalahan (Context & Problem Statement)

1. **Keterbatasan Request-Response Statis**:
   - Seluruh modul operasional VTU Admin (Pendaftaran Jamaah, Pembayaran & Invoice, Manifest Keberangkatan, Perlengkapan, dan Surat Resmi) saat ini menggunakan pola *fetch on mount* atau manual refresh.
   - Apabila seorang Admin A melakukan tindakan (misal: menyetujui kwitansi pembayaran, mendaftarkan jamaah baru, mengubah paket, atau menghapus pax), Admin B yang membuka modul yang sama di browser lain tidak mengetahui adanya perubahan tersebut secara langsung. Data baru terlihat setelah pengguna menekan F5 / refresh halaman secara manual.
   - Hal ini berisiko menimbulkan *race condition* (contoh: double-booking kuota kamar/penerbangan atau duplikasi pembuatan invoice).

2. **Kebutuhan Bisnis (Product Owner Requirement)**:
   - Pengguna menghendaki data di aplikasi bergerak secara **realtime**: ada perubahan data apapun di database, antarmuka di semua client/browser yang sedang terbuka langsung bereaksi dan memperbarui tampilannya pada detik yang sama (*zero latency & live data motion*).

---

## 2. Keputusan Arsitektur (Decision)

1. **Pondasi Arsitektur: Supabase Realtime (WebSocket Change Data Capture / CDC)**:
   - Karena database VTU Admin telah menggunakan PostgreSQL yang di-host di Supabase (`aws-0-ap-northeast-1.pooler.supabase.com`), arsitektur realtime dibangun di atas **Supabase Realtime (PostgreSQL Replication CDC)**.
   - Client admin melakukan koneksi WebSocket persisten ke Supabase Realtime channel (`vtu-operational-changes`).
   - Saluran ini mendengarkan event mutasi database (`INSERT`, `UPDATE`, `DELETE`) secara universal pada skema `public` untuk tabel-tabel inti:
     - `registration_groups`
     - `jamaah`
     - `pembayaran`
     - `invoices`
     - `keberangkatan`
     - `manifest_rows`
     - `pengambilan_perlengkapan`
     - `surat_templates`
     - `generated_surat_logs`

2. **Arsitektur Hybrid & Resilience (Zero-Config Fallback)**:
   - Untuk menjamin keandalan sistem baik saat `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` tersedia maupun saat berjalan di lingkungan staging/lokal tanpa kunci anon:
     - **Tingkat 1 (Supabase Realtime WebSocket)**: Jika env key tersedia, browser langsung berlangganan ke PostgreSQL CDC via WebSocket.
     - **Tingkat 2 (Cross-Tab BroadcastChannel & Mutation Dispatcher)**: Menggunakan HTML5 `BroadcastChannel` dan API Event Dispatcher internal sehingga setiap aksi mutasi di satu tab langsung ter-broadcast ke semua tab lain secara instan tanpa delay.
     - **Tingkat 3 (Smart Focus & Periodic Revalidation)**: Revalidasi otomatis saat jendela browser kembali aktif (*on window focus*).

3. **Client-Side Reactive Integration**:
   - Disediakan provider global `<RealtimeProvider>` di `src/app/layout.tsx`.
   - Disediakan hook `useRealtimeListener(entities, onUpdateCallback)` yang dapat dipasang di setiap modul (Pembayaran, Manifest, Jamaah, Surat, dsb.).
   - Dilengkapi visual status indicator (`RealtimeStatusIndicator`) pada header navigasi admin (menampilkan status hijau berdenyut `● Live Realtime` untuk memberikan umpan balik visual bahwa sistem sedang aktif tersambung).

---

## 3. Konsekuensi & Dampak (Consequences)

- **Positif**:
  - Kolaborasi multi-admin bebas dari data basi (*stale data*) dan *race condition*.
  - User experience terasa hidup (*alive & dynamic*) sesuai ekspektasi Product Owner.
  - Beban server minimal karena menggunakan WebSocket event-driven push alih-alih polling agresif yang membebani CPU server.
- **Tindakan Lanjutan**:
  - Menginstal `@supabase/supabase-js`.
  - Mengonfigurasi variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada Vercel dan `.env`.
  - Memastikan publication realtime di Supabase Dashboard (`supabase_realtime`) mencakup tabel-tabel utama.
