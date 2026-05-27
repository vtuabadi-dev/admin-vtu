# VTU OPERASIONAL — Deployment Guide

## Prasyarat Server

- **Ubuntu Server** 22.04 / 24.04 LTS
- **Docker** 29+ (`docker --version`)
- **Docker Compose v2** (`docker compose version`)
- **Git**
- Minimal: 2 CPU, 2 GB RAM, 20 GB disk

---

## 1. Instalasi Awal Server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Docker (official)
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version
docker compose version
```

---

## 2. Clone & Konfigurasi

```bash
# Clone repository
git clone <repo-url> /opt/vtu-operasional
cd /opt/vtu-operasional

# Buat file .env dari template
cp .env.example .env

# Edit .env — WAJIB mengganti semua password default
nano .env
```

### Minimal yang HARUS diganti di .env:
```
POSTGRES_PASSWORD=<password-kuat-unik>
REDIS_PASSWORD=<password-kuat-unik>
NEXTAUTH_SECRET=<random-64-karakter>
INTERNAL_API_KEY=<random-key>
```

---

## 3. Deploy

```bash
# Build dan jalankan semua service
docker compose up -d --build

# Cek status
docker compose ps

# Cek logs
docker compose logs -f frontend
```

Akses aplikasi di: `http://<server-ip>:3000`

---

## 4. Update Deployment

```bash
cd /opt/vtu-operasional
git pull
docker compose up -d --build
```

Container yang tidak berubah tidak akan di-rebuild (layer caching).

---

## 5. Operasi Dasar

```bash
# Lihat semua service
docker compose ps

# Lihat logs real-time
docker compose logs -f

# Lihat log service tertentu
docker compose logs -f frontend
docker compose logs -f postgres

# Restart service tertentu
docker compose restart frontend

# Stop semua service
docker compose down

# Stop dan hapus volume (HATI-HATI — data hilang)
docker compose down -v
```

---

## 6. Arsitektur Container

```
┌──────────────────────────────┐
│   Nginx Proxy Manager / Caddy │  ← Reverse Proxy (HTTPS)
│   Port 80 / 443               │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│   Frontend (Next.js)          │  ← Aplikasi utama
│   Internal Port 3000           │
└──┬──────────┬──────────┬─────┘
   │          │          │
┌──▼────┐ ┌──▼────┐ ┌───▼──────┐
│Postgre│ │ Redis │ │ Worker   │  ← Background jobs
│ 16    │ │ 7     │ │ (future) │
└───────┘ └───────┘ └──────────┘
   │          │
┌──▼──────────▼────────────────┐
│     Persistent Volumes        │
│  pgdata / redis_data / storage│
└──────────────────────────────┘
```

**Semua database dan Redis HANYA bisa diakses dari internal Docker network.** Tidak ada port publik kecuali frontend (3000).

---

## 7. Persistent Storage

Semua file dokumen dan export disimpan di Docker volumes:

| Volume | Path dalam Container | Isi |
|--------|---------------------|-----|
| `storage_passports` | `/storage/passports` | Paspor |
| `storage_ktp` | `/storage/ktp` | KTP |
| `storage_vaccines` | `/storage/vaccines` | Sertifikat Vaksin |
| `storage_pasfoto` | `/storage/pasfoto` | Pas Foto |
| `storage_exports` | `/storage/exports` | ZIP / PDF export |
| `storage_invoices` | `/storage/invoices` | Invoice export |
| `storage_manifests` | `/storage/manifests` | Manifest export |
| `storage_temp` | `/storage/temp` | File sementara |
| `pgdata` | `/var/lib/postgresql/data` | Database |
| `redis_data` | `/data` | Redis persistence |

File **SURVIVE** container restart, rebuild, dan update.

### Backup Storage

```bash
# Backup semua volume
docker run --rm \
  -v vtu_pgdata:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/pgdata-$(date +%Y%m%d).tar.gz -C /data .

# Backup storage dokumen
docker run --rm \
  -v vtu_storage_passports:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/passports-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 8. Reverse Proxy (Nginx Proxy Manager)

### Contoh konfigurasi NPM:

1. **Domain**: `vtu.example.com`
2. **Scheme**: `http`
3. **Forward Hostname**: `vtu-frontend` (nama container)
4. **Forward Port**: `3000`
5. **Websocket Support**: Enable
6. **SSL**: Request via Let's Encrypt

### Atau dengan Caddy:

```caddyfile
vtu.example.com {
    reverse_proxy vtu-frontend:3000
}
```

---

## 9. Environment Variables

Semua konfigurasi melalui `.env`. Lihat `.env.example` untuk daftar lengkap.

### Prioritas loading:
1. `.env` (production)
2. Docker Compose `environment:` block
3. Container default values

---

## 10. Healthchecks

Semua service memiliki healthcheck:

| Service | Endpoint | Interval |
|---------|----------|----------|
| frontend | `curl localhost:3000/api/health` | 30s |
| postgres | `pg_isready` | 10s |
| redis | `redis-cli ping` | 10s |
| worker | `curl localhost:3001/health` | 30s |

Cek status: `docker compose ps` (kolom STATUS menunjukkan healthy/unhealthy)

---

## 11. Monitoring Sederhana

```bash
# Resource usage
docker stats

# Logs dengan timestamp
docker compose logs -f --timestamps

# Cek disk usage volumes
docker system df -v | grep vtu_
```

---

## 12. Troubleshooting

### Container tidak start:
```bash
docker compose logs frontend
# Periksa apakah .env sudah dibuat dan password sudah diisi
```

### Database connection refused:
```bash
# Pastikan postgres healthy
docker compose ps postgres
# Cek log
docker compose logs postgres
```

### Port 3000 already in use:
```bash
# Ganti port di .env:
FRONTEND_PORT=3001
```

### Reset total (development):
```bash
docker compose down -v
docker compose up -d --build
```

---

## 13. Arsitektur Masa Depan

Sistem sudah disiapkan untuk:

- **OCR Workers**: Background processing via Redis queues (BullMQ)
- **WhatsApp Notifications**: Worker mengirim notif via WhatsApp API
- **Export Generation**: ZIP/PDF generation di worker, bukan di frontend
- **Database Migration**: Prisma / Drizzle migration saat startup
- **Horizontal Scaling**: Worker bisa di-scale `docker compose up -d --scale worker=3`

Saat fitur-fitur ini diimplementasikan, struktur Docker TIDAK perlu diubah — cukup update kode dan rebuild.

---

## 14. Checklist Produksi

- [ ] `.env` sudah diisi dengan password kuat
- [ ] `NEXTAUTH_SECRET` sudah digenerate random
- [ ] PostgreSQL TIDAK exposed ke port publik (hanya `127.0.0.1:5432`)
- [ ] Redis TIDAK exposed ke port publik (hanya `127.0.0.1:6379`)
- [ ] Reverse proxy sudah dikonfigurasi dengan HTTPS
- [ ] Backup volume sudah dijadwalkan (cron harian)
- [ ] Firewall hanya membuka port 80/443
- [ ] Log rotation sudah dikonfigurasi
