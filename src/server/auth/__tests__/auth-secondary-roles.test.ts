import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-auth", () => ({
  default: (config: any) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    config,
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: any) => config,
}));

import { authorizeUser, authConfig } from "../auth";

const mockFindUnique = vi.fn();
const mockCompare = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: any[]) => mockCompare(...args),
  },
  compare: (...args: any[]) => mockCompare(...args),
}));

describe("Secondary Roles in Auth Session & Callbacks Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("(1) authorizeUser brings secondaryRoles from database user row", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "false";

    mockFindUnique.mockResolvedValue({
      id: "usr-ops-with-roles",
      name: "Staff Multi Role",
      email: "staff@vtu.id",
      role: "admin_operasional",
      secondaryRoles: ["admin_manifest", "admin_dokumen"],
      passwordHash: "$2a$10$hashedPasswordHere",
      mustChangePassword: false,
    });
    mockCompare.mockResolvedValue(true);

    const user = await authorizeUser({
      email: "staff@vtu.id",
      password: "ValidPassword123!",
    });

    expect(user).toEqual({
      id: "usr-ops-with-roles",
      name: "Staff Multi Role",
      email: "staff@vtu.id",
      role: "admin_operasional",
      secondaryRoles: ["admin_manifest", "admin_dokumen"],
      mustChangePassword: false,
    });
  });

  it("(2) authorizeUser returns empty array [] when database user has no secondaryRoles (null or undefined)", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "false";

    mockFindUnique.mockResolvedValue({
      id: "usr-single-role",
      name: "Single Role Staff",
      email: "single@vtu.id",
      role: "admin_pembayaran",
      secondaryRoles: null,
      passwordHash: "$2a$10$hashedPasswordHere",
      mustChangePassword: false,
    });
    mockCompare.mockResolvedValue(true);

    const user = await authorizeUser({
      email: "single@vtu.id",
      password: "ValidPassword123!",
    });

    expect(user).toEqual({
      id: "usr-single-role",
      name: "Single Role Staff",
      email: "single@vtu.id",
      role: "admin_pembayaran",
      secondaryRoles: [],
      mustChangePassword: false,
    });
  });

  it("(3) demo/mock login in production remains strictly rejected", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "true"; // Attempting to turn on in production must still fail
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeUser({
      email: "superadmin@vtu.id",
      password: "SuperAdmin123!",
    });

    expect(result).toBeNull();
  });

  describe("NextAuth Callbacks (jwt & session)", () => {
    const jwtCallback = authConfig.callbacks.jwt;
    const sessionCallback = authConfig.callbacks.session;

    it("(4) handles legacy/old token without secondaryRoles safely, defaulting to [] without error", async () => {
      // Old token in cookies without secondaryRoles field
      const legacyToken: any = {
        id: "usr-legacy-001",
        role: "admin_dokumen",
        // secondaryRoles is undefined
      };

      const sessionObj: any = {
        user: {
          name: "Legacy Staff",
          email: "legacy@vtu.id",
        },
        expires: "2026-12-31T00:00:00.000Z",
      };

      // Execute session callback with legacy token
      const resolvedSession = await sessionCallback({
        session: sessionObj,
        token: legacyToken,
      });

      expect(resolvedSession.user.role).toBe("admin_dokumen");
      expect(resolvedSession.user.secondaryRoles).toEqual([]);
      expect(resolvedSession.user.id).toBe("usr-legacy-001");
    });

    it("(5) propagates secondaryRoles from user through jwt callback to session callback", async () => {
      const userFromAuthorize: any = {
        id: "usr-999",
        name: "Dual Role",
        email: "dual@vtu.id",
        role: "admin_pembayaran",
        secondaryRoles: ["admin_manifest"],
        mustChangePassword: false,
      };

      // Initial sign-in: jwt callback called with { token, user }
      const token = await jwtCallback({
        token: {},
        user: userFromAuthorize,
      });

      expect(token.role).toBe("admin_pembayaran");
      expect(token.secondaryRoles).toEqual(["admin_manifest"]);
      expect(token.id).toBe("usr-999");

      // Subsequent session resolution: session callback called with { session, token }
      const sessionObj: any = {
        user: {
          name: "Dual Role",
          email: "dual@vtu.id",
        },
        expires: "2026-12-31T00:00:00.000Z",
      };

      const resolvedSession = await sessionCallback({
        session: sessionObj,
        token,
      });

      expect(resolvedSession.user.role).toBe("admin_pembayaran");
      expect(resolvedSession.user.secondaryRoles).toEqual(["admin_manifest"]);
      expect(resolvedSession.user.id).toBe("usr-999");
    });
  });
});
