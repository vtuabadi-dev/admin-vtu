import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: any) => config,
}));

import { authorizeUser } from "../auth";

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

describe("Auth Demo Login Security & Fallback Invariants", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("(1) rejects mock credentials in production even if ALLOW_DEMO_LOGIN is set", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "true";
    mockFindUnique.mockResolvedValue(null);

    const resultAdmin = await authorizeUser({
      email: "admin@vtu.id",
      password: "admin123",
    });
    expect(resultAdmin).toBeNull();

    const resultSuper = await authorizeUser({
      email: "superadmin@vtu.id",
      password: "SuperAdmin123!",
    });
    expect(resultSuper).toBeNull();

    const resultOps = await authorizeUser({
      email: "ops@vtu.id",
      password: "admin123",
    });
    expect(resultOps).toBeNull();
  });

  it("(2) authorizes valid database user with correct bcrypt password", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "false";

    mockFindUnique.mockResolvedValue({
      id: "usr-real-123",
      name: "Super Admin Real",
      email: "superadmin@vtu.id",
      role: "super_admin",
      passwordHash: "$2a$10$hashedPasswordHere",
      mustChangePassword: false,
    });
    mockCompare.mockResolvedValue(true);

    const result = await authorizeUser({
      email: "superadmin@vtu.id",
      password: "CorrectRealPassword123!",
    });

    expect(result).toEqual({
      id: "usr-real-123",
      name: "Super Admin Real",
      email: "superadmin@vtu.id",
      role: "super_admin",
      mustChangePassword: false,
    });
    expect(mockCompare).toHaveBeenCalledWith("CorrectRealPassword123!", "$2a$10$hashedPasswordHere");
  });

  it("(3) rejects database user if password is incorrect, without falling back to mock", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.ALLOW_DEMO_LOGIN = "false";

    mockFindUnique.mockResolvedValue({
      id: "usr-real-123",
      name: "Super Admin Real",
      email: "admin@vtu.id",
      role: "super_admin",
      passwordHash: "$2a$10$hashedPasswordHere",
      mustChangePassword: false,
    });
    mockCompare.mockResolvedValue(false);

    const result = await authorizeUser({
      email: "admin@vtu.id",
      password: "WrongPassword456!",
    });

    expect(result).toBeNull();
  });

  it("(4) allows mock fallback in development when ALLOW_DEMO_LOGIN=true", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.ALLOW_DEMO_LOGIN = "true";
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeUser({
      email: "admin@vtu.id",
      password: "admin123",
    });

    expect(result).toEqual({
      id: "mock-admin-vtu-id",
      name: "Super Admin (Legacy)",
      email: "admin@vtu.id",
      role: "super_admin",
    });
  });

  it("(4b) rejects mock fallback in development if ALLOW_DEMO_LOGIN is not true", async () => {
    (process.env as any).NODE_ENV = "development";
    process.env.ALLOW_DEMO_LOGIN = "false";
    mockFindUnique.mockResolvedValue(null);

    const result = await authorizeUser({
      email: "admin@vtu.id",
      password: "admin123",
    });

    expect(result).toBeNull();
  });
});
