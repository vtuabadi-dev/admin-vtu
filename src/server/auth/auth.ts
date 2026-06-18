import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { OperationalRole } from "@/shared/types";

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

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-fallback",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials.email as string)?.toLowerCase().trim();
        const password = credentials.password as string;

        if (!email || !password) {
          console.log("[AUTH DEBUG] Missing email or password");
          return null;
        }

        // Dynamic import — Prisma is server-only and must not be bundled in middleware
        try {
          const { prisma } = await import("@/server/db/client");
          const user = await prisma.user.findUnique({ where: { email } });
          console.log("[AUTH DEBUG] DB lookup for:", email, "→ found:", !!user, "NODE_ENV:", process.env.NODE_ENV);
          if (user) {
            const bcrypt = await import("bcryptjs");
            const valid = await bcrypt.compare(password, user.passwordHash);
            console.log("[AUTH DEBUG] bcrypt.compare result:", valid, "hash prefix:", user.passwordHash.substring(0, 10));
            if (valid) {
              console.log("[AUTH DEBUG] ✅ Login SUCCESS for:", email, "role:", user.role);
              return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
            }
            console.log("[AUTH DEBUG] ❌ Password MISMATCH for:", email);
          } else {
            console.log("[AUTH DEBUG] ❌ User NOT FOUND:", email);
          }
        } catch (e: any) {
          console.log("[AUTH DEBUG] ❌ DB ERROR:", e.message || e);
        }

        // Fallback to mock credentials — dev only, never in production
        console.log("[AUTH DEBUG] Falling to mock check. NODE_ENV:", process.env.NODE_ENV);
        if (process.env.NODE_ENV === "production") {
          console.log("[AUTH DEBUG] ❌ Mock blocked in production. Returning null.");
          return null;
        }

        const mock = MOCK_CREDENTIALS[email];
        if (mock && mock.password === password) {
          console.log("[AUTH DEBUG] ✅ Mock login SUCCESS for:", email);
          return { id: `mock-${email.replace(/[^a-z0-9]/g, "-")}`, name: mock.name, email, role: mock.role };
        }

        console.log("[AUTH DEBUG] ❌ Mock FAILED for:", email);
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as OperationalRole;
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as OperationalRole;
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
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours inactive → logout
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
});
