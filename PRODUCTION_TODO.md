# Production TODO — VTU ABADI
# ============================================================
# Items ini BELUM diimplementasikan dan perlu dikerjakan
# SEBELUM go-live production penuh.
# ============================================================

## 1. BACKUP STRATEGY
**Status: BELUM**
**Priority: HIGH**

Backup service saat ini (`src/server/services/backup.service.ts`) menggunakan:
- `pg_dump` (shell command)
- `tar` (shell command)
- `psql` (shell command)
- `gunzip` (shell command)
- Local filesystem read/write

Semua di atas TIDAK kompatibel dengan Vercel serverless.

**Rekomendasi:**
- Opsi A: GitHub Actions cron job → pg_dump Supabase → upload ke Google Drive
- Opsi B: Supabase native backup (managed, otomatis tersedia di dashboard)
- Opsi C: Vercel Cron + dedicated backup endpoint yang trigger Supabase backup API
- Backup retention: 30 hari (sesuai BACKUP_RETENTION_DAYS di .env)

**File terkait:**
- `src/server/services/backup.service.ts`
- `src/app/admin/maintenance/page.tsx` (UI backup action masih mock/dummy)

---

## 2. PRODUCTION LOGGING
**Status: PARTIAL**
**Priority: MEDIUM**

Saat ini menggunakan `pino` dengan konfigurasi dasar.

**Yang perlu ditambahkan:**
- [ ] Vercel Log Drains integration (kirim log ke external service)
- [ ] Structured logging dengan trace ID per request
- [ ] Error tracking service (Sentry, Logtail, atau sejenis)
- [ ] Log retention policy
- [ ] PII redaction di log (sudah ada `redact` config di pino, perlu di-review)

**File terkait:**
- `src/server/lib/logger.ts`

---

## 3. MONITORING
**Status: BELUM**
**Priority: MEDIUM**

**Yang perlu ditambahkan:**
- [ ] Uptime monitoring (Vercel Analytics + external: BetterStack, Checkly, dll.)
- [ ] Database query performance monitoring (Supabase dashboard atau Prisma Accelerate)
- [ ] Google Drive API quota monitoring
- [ ] Google Vision API usage monitoring
- [ ] Alerting untuk: database disconnect, storage failure, OCR failure, high error rate

**File terkait:**
- `src/server/lib/health.ts` (health check endpoint sudah ada, bisa di-hook ke external monitor)

---

## 4. OBSERVABILITY
**Status: BELUM**
**Priority: LOW**

**Yang perlu ditambahkan:**
- [ ] OpenTelemetry tracing untuk request lifecycle
- [ ] Custom metrics dashboard (Vercel Analytics + custom)
- [ ] Business metrics: jumlah registrasi/hari, jumlah pembayaran/hari, OCR success rate
- [ ] Error budget / SLO definition

**File terkait:**
- `src/server/lib/metrics.ts` (metrics dasar sudah ada, perlu di-extend)

---

## 5. RATE LIMITING
**Status: BELUM**
**Priority: MEDIUM**

Environment variables `RATE_LIMIT_MAX` dan `RATE_LIMIT_WINDOW_MS` sudah didefinisikan di .env.example tapi belum ada implementasi.

**Rekomendasi:**
- Vercel Firewall (rate limiting built-in)
- Atau: Upstash Redis + @upstash/ratelimit (Vercel-friendly, serverless-compatible)

---

## 6. CORS CONFIGURATION
**Status: BELUM**
**Priority: LOW**

Tidak ada CORS configuration yang ditemukan. Jika API route akan diakses dari domain berbeda, tambahkan CORS headers.

---

## 7. MULTI-TENANT
**Status: DEFERRED**
**Priority: LOW**

Column `tenantId` sudah ada di semua tabel utama. TODO markers masih tersebar di code.
Ini adalah fitur masa depan — tidak perlu dikerjakan sekarang.

---

## 8. NOTIFICATION PROVIDER
**Status: MOCK**
**Priority: LOW**

Saat ini menggunakan `NOTIFICATION_PROVIDER=mock` (no-op).
Integrasi WhatsApp/Telegram/Email gateway ditunda.
