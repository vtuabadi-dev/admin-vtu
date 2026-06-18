import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase-ready: gunakan DATABASE_URL (Pooler dengan ?pgbouncer=true) untuk aplikasi.
// Untuk migration/seed, gunakan DIRECT_URL (tanpa pgBouncer):
//   npx prisma migrate deploy → otomatis pakai DATABASE_URL dari .env
//   npm run db:migrate      → override DATABASE_URL pakai DIRECT_URL

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"] as const
      : ["error"] as const,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
