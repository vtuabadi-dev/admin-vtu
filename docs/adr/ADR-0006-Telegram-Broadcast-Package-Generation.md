# ADR-0006: Telegram Broadcast for Package Generation

## Status
APPROVED

## Tanggal
2026-08-20

## Konteks
Saat admin membuat paket keberangkatan baru melalui fitur **Generate Paket**, informasi paket perlu disebarkan ke grup Telegram operasional agar tim terkait dapat langsung melakukan koordinasi.
Terdapat kebutuhan spesifik dari operasional:
1. Pengiriman pesan broadcast dipisahkan berdasarkan lokasi keberangkatan (*Starting Point*):
   - Grup Telegram khusus untuk paket *Starting Jakarta*.
   - Grup Telegram khusus untuk paket *Starting Surabaya*.
2. Pengiriman media broadcast mencakup **seluruh foto flyer** yang diunggah (menggunakan Telegram `sendMediaGroup` / album foto jika lebih dari 1 foto, atau `sendPhoto` jika 1 foto) dengan *caption* detail paket.
3. Setelah album flyer terkirim, sistem mengirim pesan **Reply** yang mereply foto flyer utama:
   - Jika 1 tanggal keberangkatan: Pesan reply berisi **Kode Paket Individu**.
   - Jika banyak tanggal keberangkatan: Pesan reply diawali **Kode Paket Grup** di baris pertama, disusul **Kode Paket Individu** di setiap baris berikutnya sebanyak jumlah tanggal.
4. Seluruh konfigurasi (Bot Token, ID Grup Jakarta, ID Grup Surabaya, Toggle Aktif) terpusat di halaman **Pengaturan (`/admin/pengaturan`)** di bawah Tab **Broadcast Telegram**. Halaman **Generate Paket** tidak memuat form konfigurasi Telegram.
5. Pembuatan folder Google Drive yang sudah berjalan **tetap utuh dan 100% tidak disentuh/diubah**.

## Keputusan
1. **Penyimpanan Konfigurasi**:
   - Konfigurasi disimpan dalam storage internal server (`storage/telegram_config.json`) dengan fallback ke variabel lingkungan (`process.env.TELEGRAM_BOT_TOKEN`, `process.env.TELEGRAM_GROUP_ID_JAKARTA`, `process.env.TELEGRAM_GROUP_ID_SURABAYA`, `process.env.TELEGRAM_BROADCAST_ENABLED`).
   - Disediakan API endpoint `GET/POST /api/admin/settings/telegram` untuk pengelolaan konfigurasi dari Admin UI Tab "Broadcast Telegram".

2. **Integrasi Eksekusi Broadcast**:
   - Setelah `packageService.create` berhasil membuat paket DB dan meresolusi hierarki folder Google Drive (tanpa mengubah logik Google Drive), sistem memanggil `telegramBroadcastService.sendPackageBroadcast`.
   - Mengisi payload flyer album + caption ke Telegram API `sendMediaGroup` / `sendPhoto`.
   - Mengambil `message_id` foto flyer utama, lalu mengirim pesan `sendMessage` dengan `reply_to_message_id` berisi susunan kode paket grup & individu.

## Konsekuensi
- **Positif**:
  - Tim operasional langsung menerima notifikasi terstruktur di grup Telegram sesuai lokasi keberangkatan (Jakarta / Surabaya).
  - Alur UI tetap bersih karena konfigurasi terpusat di Tab Pengaturan -> Broadcast Telegram.
  - Penanganan error async terisolasi sehingga kegagalan koneksi Telegram tidak mengganggu pembuatan paket atau Google Drive.
- **Negatif**:
  - Pengiriman banyak foto flyer base64 menambah sedikit ukuran payload API request dari browser ke server saat submit Generate Paket.
