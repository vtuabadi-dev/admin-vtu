# Pre-Deployment Operational Checklist

## 1. Environment

- [ ] `.env` exists with real secrets (passwords, AUTH_SECRET)
- [ ] `.env` is NOT tracked by Git
- [ ] `AUTH_SECRET` and `NEXTAUTH_SECRET` generated (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` is strong
- [ ] `REDIS_PASSWORD` is strong
- [ ] `AUTH_URL` and `NEXTAUTH_URL` set to actual domain

## 2. Docker

- [ ] `docker compose build` succeeds
- [ ] All containers healthy: `docker compose ps`
- [ ] PostgreSQL accepting connections: `docker compose exec postgres pg_isready`
- [ ] Redis responding: `docker compose exec redis redis-cli ping`
- [ ] Health endpoints responding: `curl http://localhost:3000/api/health`
- [ ] Worker process running: `docker compose ps worker`

## 3. Storage Persistence

- [ ] Docker volumes exist: `docker volume ls | grep vtu`
- [ ] Upload test file survives container restart
- [ ] Export files survive container restart
- [ ] Backup directory exists and writable

## 4. Database

- [ ] Migrations applied: `docker compose exec frontend npx prisma migrate status`
- [ ] Seed accounts exist: superadmin@vtu.id, admin@vtu.id
- [ ] Can connect via `psql`

## 5. Auth

- [ ] Login page loads at `/login`
- [ ] superadmin@vtu.id can login
- [ ] admin@vtu.id can login
- [ ] jamaah@vtu.id redirects to jamaah portal
- [ ] Session persists after page refresh

## 6. RBAC

- [ ] SUPER_ADMIN sees Audit Trail in sidebar
- [ ] ADMIN does NOT see Audit Trail in sidebar
- [ ] SUPER_ADMIN can access `/admin/audit-log`
- [ ] ADMIN gets redirected from `/admin/audit-log`
- [ ] `/api/audit` returns 403 for non-super-admin

## 7. Registration Lifecycle

- [ ] Public registration form loads at `/register`
- [ ] Can submit registration with all 7 steps
- [ ] Registration appears in admin review queue
- [ ] Admin can approve registration
- [ ] Jamaah accounts created with temp passwords
- [ ] DP invoice auto-generated

## 8. Payment Lifecycle

- [ ] Jamaah can login and view invoices
- [ ] Jamaah can upload DP proof
- [ ] Payment appears in admin review queue
- [ ] Admin can approve payment
- [ ] Group balance updates correctly

## 9. Document Lifecycle

- [ ] Jamaah can upload documents
- [ ] OCR worker processes upload
- [ ] Documents appear in admin review queue
- [ ] Admin can verify/reject documents

## 10. Rooming & Manifest

- [ ] Admin can generate rooming assignments
- [ ] Rooming validates gender + family grouping
- [ ] Admin can generate manifest
- [ ] Manifest shows blockers (unpaid, missing passport)

## 11. Exports

- [ ] Can trigger export via `/api/exports`
- [ ] Export worker processes job
- [ ] Can download completed export
- [ ] Export file has correct content

## 12. Worker Recovery

- [ ] Kill worker container: `docker compose kill worker`
- [ ] Worker restarts automatically
- [ ] Pending jobs resume after restart
- [ ] No duplicate job processing

## 13. Queue Health

- [ ] No stuck jobs (>1 hour waiting)
- [ ] No failed jobs without retry
- [ ] Queue stats available at `/api/admin/system-health`
- [ ] Operational diagnostics show 0 critical warnings

## 14. Tracking

- [ ] `/track` page loads without auth
- [ ] Can check registration status by kode
- [ ] Shows user-friendly Indonesian labels

## 15. Nginx (VPS only)

- [ ] Nginx config deployed: `sudo nginx -t`
- [ ] HTTPS works (SSL certificate valid)
- [ ] HTTP redirects to HTTPS
- [ ] WebSocket upgrade works (check notifications)
- [ ] Uploads work through proxy (10MB limit)
- [ ] Rate limiting active on `/api/auth/callback/credentials`
