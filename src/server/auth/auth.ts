import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { OperationalRole } from "@/shared/types";

// ── Production Secret Validation ─────────────────────────────
// AUTH_SECRET / NEXTAUTH_SECRET wajib di-set di production.
// Validasi dilakukan saat runtime (bukan build time) oleh instrumentation.ts.
// Di sini hanya logging — tidak throw agar build Vercel tetap berhasil.

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    const msg =
      "[AUTH] AUTH_SECRET atau NEXTAUTH_SECRET wajib di-set di environment variables.\n" +
      "Generate dengan: openssl rand -hex 32";
    if (process.env.NODE_ENV === "production") {
      console.error(msg);
    }
    // Fallback untuk build time — runtime akan divalidasi ulang oleh instrumentation.ts
    return "build-time-fallback-not-for-production-use";
  }
  if (process.env.NODE_ENV === "production") {
    const weakSecrets = [
      "dev-secret-change-in-production",
      "dev-secret-fallback",
      "changeme",
      "secret",
      "password",
    ];
    const isWeak = weakSecrets.some((w) => secret.toLowerCase().includes(w.toLowerCase()));
    if (isWeak) {
      console.error(
        "[AUTH] WARNING: AUTH_SECRET / NEXTAUTH_SECRET menggunakan nilai development yang lemah.\n" +
        "Generate production secret dengan: openssl rand -hex 32\n" +
        "Lalu set di environment variables Vercel / .env."
      );
    }
  }
  return secret;
}

const MOCK_CREDENTIALS: Record<string, { password: string; role: OperationalRole; name: string }> = {
  "superadmin@vtu.id": { password: "SuperAdmin123!", role: "super_admin", name: "Super Admin" },
  "admin@vtu.id": { password: "admin123", role: "super_admin", name: "Super Admin (Legacy)" },
  "ops@vtu.id": { password: "admin123", role: "admin_operasional", name: "Admin Operasional" },
  "finance@vtu.id": { password: "admin123", role: "admin_pembayaran", name: "Admin Pembayaran" },
  "manifest@vtu.id": { password: "admin123", role: "admin_manifest", name: "Admin Manifest" },
  "docs@vtu.id": { password: "admin123", role: "admin_dokumen", name: "Admin Dokumen" },
  "tl@vtu.id": { password: "admin123", role: "tour_leader", name: "Tour Leader" },
  "jamaah@vtu.id": { password: "admin123", role: "jamaah", name: "Jamaah Demo" },
};



export async function authorizeUser(credentials: Record<string, unknown> | undefined) {
  const email = (credentials?.email as string)?.toLowerCase().trim();
  const password = credentials?.password as string;

  if (!email || !password) {
    return null;
  }

  // Dynamic import — Prisma is server-only and must not be bundled in middleware
  try {
    const { prisma } = await import("@/server/db/client");
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (valid) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          secondaryRoles: (user.secondaryRoles as OperationalRole[]) ?? [],
          mustChangePassword: user.mustChangePassword,
        };
      }
    }
  } catch (e) {
    console.error("[AUTH] DB error saat login", (e as Error)?.name);
  }

  // Fallback to predefined instant/demo credentials (strictly disabled in production)
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_LOGIN === "true") {
    const mock = MOCK_CREDENTIALS[email];
    if (mock && mock.password === password) {
      return { id: `mock-${email.replace(/[^a-z0-9]/g, "-")}`, name: mock.name, email, role: mock.role, secondaryRoles: [] };
    }
  }

  return null;
}

export const authConfig = {
  secret: getAuthSecret(),
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role as OperationalRole;
        token.secondaryRoles = (user.secondaryRoles as OperationalRole[]) ?? [];
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role as OperationalRole;
        session.user.secondaryRoles = (token.secondaryRoles as OperationalRole[]) ?? [];
        session.user.id = token.id as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 hari (persistent session)
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 hari (persistent JWT)
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
