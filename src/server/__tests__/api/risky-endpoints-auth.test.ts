import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/server/auth", () => ({
  auth: () => mockAuth(),
}));

const mockExecuteRawUnsafe = vi.fn();
const mockQueryRawUnsafe = vi.fn();
vi.mock("@/server/db/client", () => ({
  prisma: {
    $executeRawUnsafe: (...args: any[]) => mockExecuteRawUnsafe(...args),
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
  },
}));

import { GET as getMigrateTerms } from "@/app/api/migrate-terms/route";
import { GET as getGoogleDriveSetup } from "@/app/api/auth/google-drive-setup/route";

describe("Risky Endpoints Protection Suite (migrate-terms & google-drive-setup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  describe("GET /api/migrate-terms", () => {
    it("returns 401 when request has no session", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await getMigrateTerms();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ success: false, message: "Unauthorized" });
      expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();
    });

    it("returns 403 when session user is not super_admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "admin_operasional" } });

      const res = await getMigrateTerms();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ success: false, message: "Forbidden" });
      expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();
    });

    it("proceeds with migration and returns 200 when session user is super_admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-super", role: "super_admin" } });
      mockExecuteRawUnsafe.mockResolvedValue(1);
      mockQueryRawUnsafe.mockResolvedValue([{ cnt: 1 }]);

      const res = await getMigrateTerms();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockExecuteRawUnsafe).toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/google-drive-setup", () => {
    const makeReq = (url = "http://localhost:3000/api/auth/google-drive-setup") =>
      new NextRequest(url);

    it("returns 401 when request has no session", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await getGoogleDriveSetup(makeReq());
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ success: false, message: "Unauthorized" });
    });

    it("returns 403 when session user is not super_admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-2", role: "admin_pembayaran" } });

      const res = await getGoogleDriveSetup(makeReq());
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ success: false, message: "Forbidden" });
    });

    it("allows super_admin to proceed into OAuth initiation flow", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-super", role: "super_admin" } });

      const res = await getGoogleDriveSetup(makeReq());
      // Step 1: redirects to Google OAuth consent page
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("accounts.google.com");
      expect(location).toContain("client_id=test-client-id");
    });
  });
});
