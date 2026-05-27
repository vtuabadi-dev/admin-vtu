import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { OperationalRole } from "@/shared/types";

const MOCK_CREDENTIALS: Record<string, { password: string; role: OperationalRole; name: string }> = {
  "admin@vtu.id": { password: "admin123", role: "super_admin", name: "Super Admin" },
  "ops@vtu.id": { password: "admin123", role: "admin_operasional", name: "Admin Operasional" },
  "finance@vtu.id": { password: "admin123", role: "admin_pembayaran", name: "Admin Pembayaran" },
  "manifest@vtu.id": { password: "admin123", role: "admin_manifest", name: "Admin Manifest" },
  "docs@vtu.id": { password: "admin123", role: "admin_dokumen", name: "Admin Dokumen" },
  "tl@vtu.id": { password: "admin123", role: "tour_leader", name: "Tour Leader" },
  "jamaah@vtu.id": { password: "admin123", role: "jamaah", name: "Jamaah Demo" },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        if (!email || !password) return null;

        // Dynamic import — Prisma is server-only and must not be bundled in middleware
        try {
          const { prisma } = await import("@/server/db/client");
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            const bcrypt = await import("bcryptjs");
            const valid = await bcrypt.compare(password, user.passwordHash);
            if (valid) {
              return { id: user.id, name: user.name, email: user.email, role: user.role };
            }
          }
        } catch {
          // DB unavailable — fall through to mock
        }

        // Fallback to mock credentials (dev / no-DB)
        const mock = MOCK_CREDENTIALS[email];
        if (mock && mock.password === password) {
          return { id: `mock-${email.replace(/[^a-z0-9]/g, "-")}`, name: mock.name, email, role: mock.role };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as OperationalRole;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as OperationalRole;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
