# VTU Operational System

Sistem operasional perjalanan umroh — manajemen jamaah, dokumen, pembayaran, manifest, rooming, dan keberangkatan.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | Auth.js v5 (Credentials + JWT) |
| Storage | Local filesystem (S3-ready) |
| OCR | Google Vision API / custom external OCR API |
| Container | Docker Compose |

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env

# 3. Run database + Redis
docker compose up -d postgres redis

# 4. Run migrations
npx prisma migrate deploy

# 5. Seed data
npx prisma db seed

# 6. Start dev server
npm run dev
```

Open http://localhost:3000

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env — set passwords and secrets

docker compose up -d --build
```

## Seed Accounts

| Email | Password | Role |
|---|---|---|
| superadmin@vtu.id | SuperAdmin123! | SUPER_ADMIN |
| admin@vtu.id | admin123 | SUPER_ADMIN |
| ops@vtu.id | admin123 | OWNER |
| finance@vtu.id | admin123 | ADMIN |
| manifest@vtu.id | admin123 | ADMIN |
| docs@vtu.id | admin123 | STAFF |
| tl@vtu.id | admin123 | VIEWER |
| jamaah@vtu.id | admin123 | VIEWER |

## Project Structure

```
src/
  app/                    # Next.js App Router
    admin/                # Admin portal
    jamaah/               # Jamaah portal
    register/             # Public registration
    track/                # Self-service tracking
    api/                  # API routes (40+ endpoints)
  server/
    auth/                 # Auth.js configuration
    db/                   # Prisma client
    lib/                  # Health, metrics, rate-limit
    queue/                # BullMQ producer + workers
    repositories/         # Data access layer
    services/             # OCR, export, backup, notify
    storage/              # File storage adapter
  shared/
    components/           # Shared UI components
    hooks/                # React hooks
    lib/                  # RBAC, readiness, validators
    types/                # TypeScript type definitions
  stores/                 # Zustand state management
  services/               # Queue types, storage paths
prisma/
  schema.prisma           # Database schema
  migrations/             # Migration history
  seed.ts                 # Production seed
  seed-dev.ts             # Development seed
```

## Workers

| Worker | Queue | Status |
|---|---|---|
| OCR | document-ocr | Active |
| Export | export-generator | Active |
| Manifest | manifest-generate | Active |
| Backup | backup-database | Active |
| Notification | notification-dispatch | Active |
| Cleanup | cleanup-temp | Active |
| Broadcast | broadcast-dispatch | Active |
| Reminder | payment-reminder | Active |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma db seed   # Seed database
```

## Deployment

See `DEPLOYMENT.md` for VPS deployment guide.

### Docker Compose services

- `frontend` — Next.js app (port 3000)
- `worker` — BullMQ background processor
- `postgres` — PostgreSQL 16
- `redis` — Redis 7
- `db-init` — One-shot migration runner

### Production checklist

1. Set strong passwords in `.env`
2. Generate `AUTH_SECRET` + `NEXTAUTH_SECRET` (`openssl rand -hex 32`)
3. Configure reverse proxy (nginx/Caddy) + SSL
4. Run `docker compose up -d --build`

## Environment Variables

See `.env.example` for full list with descriptions. Key variables:

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | Yes | Redis connection string |
| AUTH_SECRET | Yes | Auth.js JWT signing key |
| AUTH_URL | Yes | Application URL |
| OCR_PROVIDER | Yes | `google-vision` for Google Vision API, or `external-api` for a custom OCR gateway |
| GOOGLE_VISION_API_KEY | If google-vision | Google Cloud Vision API key |
| NOTIFICATION_PROVIDER | No | `mock` (default), `console` |

## License

Private — internal operational use only.
