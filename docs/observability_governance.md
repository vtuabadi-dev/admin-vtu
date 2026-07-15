# Observability Governance

Dokumen ini mendefinisikan kebijakan tingkat visibilitas sistem (Observability) yang wajib diterapkan untuk memastikan stabilitas, performa, dan pelacakan isu (debugging) yang optimal.

## 1. Logging Standard
- Log berformat **JSON** wajib diterapkan pada level Production agar mudah diindeks oleh mesin agregator.
- Log harus mencakup metadata esensial: `timestamp`, `level` (INFO, WARN, ERROR, DEBUG), `requestId` (jika konteks web request), dan `context`.
- Filter semua PII (Personally Identifiable Information) dari log (misal: sandi, token, detail kartu kredit).

## 2. Monitoring & Metrics
Aplikasi wajib terekspos (atau mengirim data telemetri) pada sistem monitoring terpusat yang memantau minimal 4 The Golden Signals:
- **Latency**: Waktu respons request.
- **Traffic**: Jumlah trafik/request.
- **Errors**: Tingkat kegagalan (HTTP 500, Exception).
- **Saturation**: Beban sistem (CPU, Memory, Disk).

## 3. Health Check
Endpoint Health Check (`/api/health` atau serupa) wajib eksis dan memberikan indikasi status komponen internal:
- **Liveness Probe**: Apakah server Node.js berjalan?
- **Readiness Probe**: Apakah Prisma sukses terhubung ke Database Supabase?

## 4. Tracing
Setiap Request masuk dari Klien (Browser/Mobile) wajib disuntikkan **Correlation ID** / **Trace ID**. Trace ID ini harus direpresentasikan di dalam semua logging service dan dilempar secara konstan antara komunikasi microservices (atau layanan internal lainnya) agar mempermudah alur pelacakan.

## 5. Audit Log
Tindakan pengguna (terutama mutasi data sensitif seperti CRUD User, Pembayaran, Penghapusan Data) wajib ditulis dalam sebuah **Audit Trail**. Audit Log tidak boleh diubah (Immutable) dan setidaknya menyimpan:
- Aktor (Siapa yang melakukan)
- Aksi (Operasi apa)
- Resource (ID entitas target)
- Timestamp
- Data Before/After (Opsional tapi direkomendasikan).

## 6. Error Tracking
Gunakan layanan Error Tracking (misal: Sentry) yang otomatis menangkap unhandled exceptions dan melampirkan context:
- Environment (Production vs Staging)
- Version / Release Tag
- Stack Trace yang ter-de-obfuscate dengan Source Maps.

## 7. Alerting
Sistem monitoring wajib dipasangkan dengan aturan notifikasi (Alerts):
- **High Priority**: Downtime server, Database terputus, Lonjakan Error rate signifikan. Wajib memberitahu tim On-Call (misalnya via PagerDuty/Slack).
- **Low Priority**: Peringatan awal CPU usage tinggi, Memory usage 80%, dsb. Notifikasi melalui email atau channel warning.
Kelelahan akibat Alert (Alert Fatigue) harus dihindari dengan menaikkan threshold ke level yang benar-benar actionable.
