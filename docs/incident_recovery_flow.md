# Incident Recovery Flow

Alur standar yang harus diikuti saat menangani dan merecover sistem dari insiden, mencakup identifikasi akar masalah dan langkah perbaikan yang tepat.

## Kategori Error

### F — Configuration Error
Kategori ini mencakup kesalahan pada file konfigurasi tingkat sistem atau framework.
*Contoh*: 
- `next.config.js`
- `tsconfig.json`
- `eslint.config`
- `tailwind.config`
- `middleware`
- `vite.config`
- `webpack config`
- `environment loader`

**Mengapa Configuration Error berbeda?**
- Berbeda dengan **Source Code Error** yang melibatkan cacat pada alur logika bisnis atau sintaks, Configuration Error adalah kegagalan pada lapisan integrasi, linter, atau setup compiler.
- Berbeda dengan **Dependency Error** yang biasanya muncul karena versi paket/pustaka pihak ketiga yang tidak cocok, Configuration Error terkait dengan bagaimana framework atau toolchain diinstruksikan untuk menjalankan proyek tersebut.
- Berbeda dengan **Environment Error** yang disebabkan oleh faktor infrastruktur host (misal: variabel environment di OS server, database down, port bentrok), Configuration Error berasal dari definisi statis yang ada di dalam repository proyek.

*(Kategori A, B, C, D, E mengikuti standar yang telah ditetapkan sebelumnya).*
