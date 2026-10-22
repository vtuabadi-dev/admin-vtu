# ADR-0027: Persistensi Sesi Autentikasi Tanpa Auto-Logout dan Penonaktifan Intro (SplashScreen) Berulang

## Status
PROPOSED (Waiting Product Owner Approval)

## Tanggal
2026-10-22

## Konteks
1. Pada sistem saat ini:
   - Sesi autentikasi admin diatur oleh logika inaktivitas jam kerja ([`auth-store.ts`](file:///d:/Projects/app-admin-vtu/src/stores/auth-store.ts)), di mana sesi otomatis kadaluarsa (auto-logout / close) saat mencapai jam 17:00 WIB atau setelah inaktif 3 jam di luar jam kerja.
   - Pada sisi server ([`auth.ts`](file:///d:/Projects/app-admin-vtu/src/server/auth/auth.ts)), durasi sesi JWT dibatasi 24 jam (`maxAge: 86400`).
   - Akibatnya, admin seringkali mendapati aplikasi tertutup/ter-logout secara otomatis ketika browser ditutup dan dibuka kembali keesokan harinya, meskipun admin tidak pernah menekan tombol **Keluar**.
2. Komponen Intro ([`SplashScreen.tsx`](file:///d:/Projects/app-admin-vtu/src/shared/components/layout/SplashScreen.tsx)) selalu dijalankan setiap kali browser dibuka atau halaman di-refresh dengan delay buatan animasi minimal 2.5 detik (`minDuration = 2500ms`).
3. Operasional VTU menghendaki:
   - **Persistensi Sesi Penuh**: Selama admin tidak secara eksplisit menekan tombol **Keluar (Logout)**, aplikasi tidak boleh tertutup/ter-logout otomatis. Admin tetap dapat langsung bekerja saat membuka kembali peramban.
   - **Penonaktifan Intro Berulang**: Saat membuka kembali aplikasi, intro (animasi splash screen 2.5 detik) **tidak perlu dijalankan lagi**. Aplikasi langsung masuk ke halaman utama secara instan.

## Keputusan Arsitektur
1. **Penghapusan Auto-Logout Inaktivitas (Persistent Session)**:
   - Modifikasi fungsi evaluasi inaktivitas di [`src/stores/auth-store.ts`](file:///d:/Projects/app-admin-vtu/src/stores/auth-store.ts):
     - `evaluateSessionExpired` diatur untuk selalu mengembalikan `false` selama user masih terautentikasi (kecuali dipicu oleh logout manual).
   - Penyesuaian durasi sesi server pada [`src/server/auth/auth.ts`](file:///d:/Projects/app-admin-vtu/src/server/auth/auth.ts):
     - Memperpanjang usia cookie sesi dan token JWT menjadi 30 hari (`maxAge: 30 * 24 * 60 * 60`) untuk memastikan sesi persisten lintas hari.
2. **Siklus Hidup Intro Tunggal (Single Intro Lifecycle)**:
   - Menyimpan penanda `vtu_intro_completed` di `localStorage`:
     - Saat [`SplashScreen.tsx`](file:///d:/Projects/app-admin-vtu/src/shared/components/layout/SplashScreen.tsx) selesai ditampilkan pertama kali, set `localStorage.setItem("vtu_intro_completed", "true")`.
     - Ketika admin membuka aplikasi kembali (refresh tab, buka tab baru, atau buka browser kembali), sistem mengecek `localStorage.getItem("vtu_intro_completed")`. Jika sudah `true`, komponen `SplashScreen` langsung me-return `null` tanpa menampilkan overlay animasi dan tanpa delay 2.5 detik. Pengambilan data awal (`loadAllData()`) tetap berjalan di background tanpa memblokir antarmuka.
3. **Reset Intro pada Logout Eksplisit**:
   - Hanya ketika admin menekan tombol **Keluar** (`logout()` di `auth-store.ts` atau `Shell.tsx`), sistem menghapus `vtu_intro_completed` dari `localStorage`.
   - Dengan demikian, jika admin sengaja keluar dan login kembali dengan akun baru/sama, intro dapat diperkenalkan kembali secara wajar.

## Konsekuensi
- **Positif**:
  - Pengalaman pengguna jauh lebih cepat dan mulus (zero-latency visual delay saat membuka aplikasi).
  - Admin tidak terganggu oleh auto-logout di tengah aktivitas atau saat membuka laptop keesokan harinya.
- **Negatif / Mitigasi Keamanan**:
  - Perangkat bersama (shared PC) tetap harus mengandalkan tombol logout manual saat admin meninggalkan meja kerja. Edukasi operasional tetap disosialisasikan.
