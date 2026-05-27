# ============================================================
# TRAVEL OPERATIONAL SYSTEM — Production Dockerfile
# ============================================================
# Multi-stage build optimized for:
#   - Small image size
#   - Layer caching (deps → builder → runner)
#   - Standalone Next.js output
#   - Ubuntu / Debian Linux compatibility
# ============================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files only (layer cache)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install production deps first, then dev deps for build
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm install; \
  fi

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js app (standalone output)
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else npm run build; \
  fi

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
RUN apk add --no-cache tini curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public

# Copy the standalone build — Next.js places it here
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create storage directories with proper permissions
RUN mkdir -p /storage/passports /storage/ktp /storage/vaccines \
  /storage/pasfoto /storage/exports /storage/temp \
  /storage/invoices /storage/manifests \
  && chown -R nextjs:nodejs /storage

# Use non-root user
USER nextjs

# Expose internal port (reverse proxy connects here)
EXPOSE 3000

# Environment
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the Next.js server
CMD ["node", "server.js"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
