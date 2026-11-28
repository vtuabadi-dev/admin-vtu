import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock Auth ───────────────────────────────────────────
const mockAuth = vi.fn();
vi.mock("@/server/auth", () => ({
  auth: () => mockAuth(),
}));

// ── Mock Telegram Broadcast Service ─────────────────────
const mockGetTelegramConfig = vi.fn();
const mockUpdateTelegramConfig = vi.fn();
const mockSendPackageBroadcast = vi.fn();

vi.mock("@/server/services/telegram-broadcast.service", () => ({
  getTelegramConfig: () => mockGetTelegramConfig(),
  updateTelegramConfig: (data: any) => mockUpdateTelegramConfig(data),
  sendPackageBroadcast: (...args: any[]) => mockSendPackageBroadcast(...args),
}));

// ── Mock Prisma DB Client ───────────────────────────────
const mockPrismaFindMany = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockPrismaCreate = vi.fn();
const mockPrismaUpdate = vi.fn();
const mockPrismaDelete = vi.fn();
const mockPrismaUpdateMany = vi.fn();
const mockPrismaAggregate = vi.fn();
const mockPrismaCount = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: {
    ocrProvider: {
      findMany: (...args: any[]) => mockPrismaFindMany(...args),
      findUnique: (...args: any[]) => mockPrismaFindUnique(...args),
      create: (...args: any[]) => mockPrismaCreate(...args),
      update: (...args: any[]) => mockPrismaUpdate(...args),
      delete: (...args: any[]) => mockPrismaDelete(...args),
      updateMany: (...args: any[]) => mockPrismaUpdateMany(...args),
      aggregate: (...args: any[]) => mockPrismaAggregate(...args),
      count: (...args: any[]) => mockPrismaCount(...args),
    },
  },
}));

// ── Mock OCR Registry Cache ─────────────────────────────
vi.mock("@/server/services/ocr/registry", () => ({
  invalidateCache: vi.fn(),
}));

// ── Import Routes & Repository ──────────────────────────
import { GET as getTelegram, POST as postTelegram } from "@/app/api/admin/settings/telegram/route";
import { GET as getOcrProviders, POST as postOcrProviders } from "@/app/api/admin/ocr/providers/route";
import {
  GET as getOcrProviderById,
  PUT as putOcrProviderById,
  DELETE as deleteOcrProviderById,
  PATCH as patchOcrProviderById,
} from "@/app/api/admin/ocr/providers/[id]/route";
import { POST as postResetCooldowns } from "@/app/api/admin/ocr/reset-cooldowns/route";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";

// Helper to create NextRequest with JSON body
function makeJsonRequest(url: string, method: string, body?: any): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init as any);
}

const ALL_ROLES = [
  "super_admin",
  "admin_operasional",
  "admin_pembayaran",
  "admin_manifest",
  "admin_dokumen",
  "admin_badal",
  "tour_leader",
  "jamaah",
] as const;

describe("Settings Secrets Masking & Role Restriction Suite (TUGAS 7)", () => {
  const sampleProviderDbRow = {
    id: "ocr-prov-1",
    label: "Google Vision Primary",
    providerType: "google_vision",
    apiKey: "AIzaSyD-TEST-SECRET-12345678",
    apiUrl: null,
    apiHeaderName: null,
    apiHeaderPrefix: null,
    isActive: true,
    rotationOrder: 1,
    rotationCount: 2,
    requestCounter: 10,
    dailyUsage: 5,
    dailyLimit: 1000,
    healthStatus: "active",
    cooldownUntil: null,
    lastUsedAt: new Date("2026-11-28T10:00:00Z"),
    lastErrorAt: null,
    lastErrorMsg: null,
    consecutiveErrors: 0,
    successRate: 0.98,
    totalRequests: 50,
    totalErrors: 1,
    averageLatencyMs: 340,
    totalPages: 50,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-11-28T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTelegramConfig.mockResolvedValue({
      botToken: "123456789:ABCdefGHIjklMNOpqrs-RAW_SECRET",
      groupIdJakarta: "-1001111111111",
      groupIdSurabaya: "-1002222222222",
      enabled: true,
    });
    mockPrismaFindMany.mockResolvedValue([sampleProviderDbRow]);
    mockPrismaFindUnique.mockResolvedValue(sampleProviderDbRow);
    mockPrismaAggregate.mockResolvedValue({ _max: { rotationOrder: 1 } });
    mockPrismaCount.mockResolvedValue(5);
  });

  // ──────────────────────────────────────────────────────────
  // (1) Respons GET Telegram dan OCR tidak pernah mengandung rahasia mentah
  // ──────────────────────────────────────────────────────────
  describe("1. GET Responses Never Expose Raw Secrets", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "u-1", role: "super_admin" } });
    });

    it("GET /api/admin/settings/telegram masks botToken and removes raw botToken", async () => {
      const res = await getTelegram();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data.maskedToken).toBeDefined();
      expect(json.data.maskedToken).toContain("••••••••");
      // Assert raw secret is NOT present anywhere in response data
      expect(json.data.botToken).toBeUndefined();
      expect(JSON.stringify(json)).not.toContain("RAW_SECRET");
    });

    it("GET /api/admin/ocr/providers masks apiKey with apiKeyMasked and removes raw apiKey", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/admin/ocr/providers", "GET");
      const res = await getOcrProviders(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data[0].apiKeyMasked).toBe("••••5678");
      expect(json.data[0].apiKey).toBeUndefined();
      expect(JSON.stringify(json)).not.toContain("AIzaSyD-TEST-SECRET");
    });

    it("GET /api/admin/ocr/providers/[id] masks apiKey with apiKeyMasked and removes raw apiKey", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "GET");
      const res = await getOcrProviderById(req, { params: { id: "ocr-prov-1" } });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.data.apiKeyMasked).toBe("••••5678");
      expect(json.data.apiKey).toBeUndefined();
      expect(JSON.stringify(json)).not.toContain("AIzaSyD-TEST-SECRET");
    });
  });

  // ──────────────────────────────────────────────────────────
  // (2) Simpan tanpa mengetik token baru tidak menimpa token lama
  // ──────────────────────────────────────────────────────────
  describe("2. Saving Without New Token Does Not Overwrite Existing Secret", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "u-1", role: "super_admin" } });
    });

    it("POST Telegram with masked token does not send botToken to update service", async () => {
      mockUpdateTelegramConfig.mockResolvedValue({
        botToken: "123456789:ABCdefGHIjklMNOpqrs-RAW_SECRET",
        groupIdJakarta: "-1009999999999",
        groupIdSurabaya: "-1002222222222",
        enabled: true,
      });

      const req = makeJsonRequest("http://localhost:3000/api/admin/settings/telegram", "POST", {
        botToken: "123456••••••••qrs-RAW_SECRET",
        groupIdJakarta: "-1009999999999",
      });

      const res = await postTelegram(req);
      expect(res.status).toBe(200);

      expect(mockUpdateTelegramConfig).toHaveBeenCalledWith({
        groupIdJakarta: "-1009999999999",
        groupIdSurabaya: undefined,
        enabled: undefined,
      });
      // Ensure botToken was not in the update payload
      const calledArg = mockUpdateTelegramConfig.mock.calls[0][0];
      expect(calledArg.botToken).toBeUndefined();
    });

    it("POST Telegram with empty botToken does not overwrite existing token", async () => {
      mockUpdateTelegramConfig.mockResolvedValue({
        botToken: "123456789:ABCdefGHIjklMNOpqrs-RAW_SECRET",
        groupIdJakarta: "-1001111111111",
        groupIdSurabaya: "-1002222222222",
        enabled: false,
      });

      const req = makeJsonRequest("http://localhost:3000/api/admin/settings/telegram", "POST", {
        botToken: "",
        enabled: false,
      });

      const res = await postTelegram(req);
      expect(res.status).toBe(200);

      const calledArg = mockUpdateTelegramConfig.mock.calls[0][0];
      expect(calledArg.botToken).toBeUndefined();
    });

    it("PUT OCR provider with masked apiKey deletes apiKey from update input", async () => {
      mockPrismaUpdate.mockResolvedValue(sampleProviderDbRow);

      const req = makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "PUT", {
        label: "Updated Name Only",
        apiKey: "••••5678",
      });

      const res = await putOcrProviderById(req, { params: { id: "ocr-prov-1" } });
      expect(res.status).toBe(200);

      expect(mockPrismaUpdate).toHaveBeenCalled();
      const updateData = mockPrismaUpdate.mock.calls[0][0].data;
      expect(updateData.apiKey).toBeUndefined();
      expect(updateData.label).toBe("Updated Name Only");
    });

    it("PUT OCR provider with empty apiKey deletes apiKey from update input", async () => {
      mockPrismaUpdate.mockResolvedValue(sampleProviderDbRow);

      const req = makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "PUT", {
        label: "Another Update",
        apiKey: "   ",
      });

      const res = await putOcrProviderById(req, { params: { id: "ocr-prov-1" } });
      expect(res.status).toBe(200);

      const updateData = mockPrismaUpdate.mock.calls[0][0].data;
      expect(updateData.apiKey).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // (3) Simpan dengan token baru berhasil memperbarui
  // ──────────────────────────────────────────────────────────
  describe("3. Saving With New Token Successfully Updates", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "u-1", role: "super_admin" } });
    });

    it("POST Telegram with real new token updates botToken", async () => {
      mockUpdateTelegramConfig.mockResolvedValue({
        botToken: "999888777:NEW_BRAND_NEW_TOKEN",
        groupIdJakarta: "-1001111111111",
        groupIdSurabaya: "-1002222222222",
        enabled: true,
      });

      const req = makeJsonRequest("http://localhost:3000/api/admin/settings/telegram", "POST", {
        botToken: "999888777:NEW_BRAND_NEW_TOKEN",
      });

      const res = await postTelegram(req);
      expect(res.status).toBe(200);

      const calledArg = mockUpdateTelegramConfig.mock.calls[0][0];
      expect(calledArg.botToken).toBe("999888777:NEW_BRAND_NEW_TOKEN");
    });

    it("PUT OCR provider with real new key updates apiKey", async () => {
      mockPrismaUpdate.mockResolvedValue({
        ...sampleProviderDbRow,
        apiKey: "NEW-AIzaSyD-BRAND-NEW-KEY-9999",
      });

      const req = makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "PUT", {
        apiKey: "NEW-AIzaSyD-BRAND-NEW-KEY-9999",
      });

      const res = await putOcrProviderById(req, { params: { id: "ocr-prov-1" } });
      expect(res.status).toBe(200);

      const updateData = mockPrismaUpdate.mock.calls[0][0].data;
      expect(updateData.apiKey).toBe("NEW-AIzaSyD-BRAND-NEW-KEY-9999");

      // Verify response is masked
      const json = await res.json();
      expect(json.data.apiKeyMasked).toBe("••••9999");
      expect(json.data.apiKey).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // (4) Matriks peran (200/201 vs 403) untuk SEMUA 8 peran
  // ──────────────────────────────────────────────────────────
  describe("4. Role Permission Matrix (All 8 Roles across Endpoints)", () => {
    const endpoints = [
      {
        name: "GET /api/admin/settings/telegram",
        handler: () => getTelegram(),
      },
      {
        name: "POST /api/admin/settings/telegram",
        handler: () =>
          postTelegram(
            makeJsonRequest("http://localhost:3000/api/admin/settings/telegram", "POST", {
              enabled: true,
            })
          ),
      },
      {
        name: "GET /api/admin/ocr/providers",
        handler: () =>
          getOcrProviders(makeJsonRequest("http://localhost:3000/api/admin/ocr/providers", "GET")),
      },
      {
        name: "POST /api/admin/ocr/providers",
        handler: () => {
          mockPrismaCreate.mockResolvedValue(sampleProviderDbRow);
          return postOcrProviders(
            makeJsonRequest("http://localhost:3000/api/admin/ocr/providers", "POST", {
              label: "New Prov",
              providerType: "google_vision",
              apiKey: "AIzaTest-1111",
            })
          );
        },
      },
      {
        name: "GET /api/admin/ocr/providers/[id]",
        handler: () =>
          getOcrProviderById(
            makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "GET"),
            { params: { id: "ocr-prov-1" } }
          ),
      },
      {
        name: "PUT /api/admin/ocr/providers/[id]",
        handler: () => {
          mockPrismaUpdate.mockResolvedValue(sampleProviderDbRow);
          return putOcrProviderById(
            makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "PUT", {
              label: "Updated",
            }),
            { params: { id: "ocr-prov-1" } }
          );
        },
      },
      {
        name: "PATCH /api/admin/ocr/providers/[id]",
        handler: () => {
          mockPrismaFindUnique.mockResolvedValue(sampleProviderDbRow);
          mockPrismaUpdate.mockResolvedValue(sampleProviderDbRow);
          return patchOcrProviderById(
            makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "PATCH", { action: "toggle" }),
            { params: { id: "ocr-prov-1" } }
          );
        },
      },
      {
        name: "POST /api/admin/ocr/reset-cooldowns",
        handler: () => {
          mockPrismaUpdateMany.mockResolvedValue({ count: 2 });
          return postResetCooldowns(
            makeJsonRequest("http://localhost:3000/api/admin/ocr/reset-cooldowns", "POST")
          );
        },
      },
    ];

    for (const ep of endpoints) {
      describe(ep.name, () => {
        for (const role of ALL_ROLES) {
          const isAllowed = role === "super_admin" || role === "admin_operasional";

          it(`returns ${isAllowed ? "allowed (200/201)" : "403"} for role: ${role}`, async () => {
            mockAuth.mockResolvedValue({ user: { id: `u-${role}`, role } });
            mockUpdateTelegramConfig.mockResolvedValue({
              botToken: "tok",
              groupIdJakarta: "jkt",
              groupIdSurabaya: "sub",
              enabled: true,
            });

            const res = await ep.handler();
            if (isAllowed) {
              expect([200, 201]).toContain(res.status);
            } else {
              expect(res.status).toBe(403);
            }
          });
        }

        it("allows access if user has admin_operasional in secondaryRoles", async () => {
          mockAuth.mockResolvedValue({
            user: {
              id: "u-sec",
              role: "admin_pembayaran",
              secondaryRoles: ["admin_operasional"],
            },
          });
          mockUpdateTelegramConfig.mockResolvedValue({
            botToken: "tok",
            groupIdJakarta: "jkt",
            groupIdSurabaya: "sub",
            enabled: true,
          });

          const res = await ep.handler();
          expect([200, 201]).toContain(res.status);
        });

        it("returns 401 when there is no active session", async () => {
          mockAuth.mockResolvedValue(null);
          const res = await ep.handler();
          expect(res.status).toBe(401);
        });
      });
    }

    describe("DELETE /api/admin/ocr/providers/[id] (Strictly super_admin only)", () => {
      const deleteHandler = () => {
        mockPrismaDelete.mockResolvedValue(sampleProviderDbRow);
        return deleteOcrProviderById(
          makeJsonRequest("http://localhost:3000/api/admin/ocr/providers/ocr-prov-1", "DELETE"),
          { params: { id: "ocr-prov-1" } }
        );
      };

      it("returns 200 for super_admin", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u-super", role: "super_admin" } });
        const res = await deleteHandler();
        expect(res.status).toBe(200);
      });

      it("returns 403 for admin_operasional (restricted to super_admin only)", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u-ops", role: "admin_operasional" } });
        const res = await deleteHandler();
        expect(res.status).toBe(403);
      });

      for (const role of ALL_ROLES) {
        if (role !== "super_admin") {
          it(`returns 403 for role: ${role}`, async () => {
            mockAuth.mockResolvedValue({ user: { id: `u-${role}`, role } });
            const res = await deleteHandler();
            expect(res.status).toBe(403);
          });
        }
      }

      it("allows access if user has super_admin in secondaryRoles", async () => {
        mockAuth.mockResolvedValue({
          user: {
            id: "u-sec-super",
            role: "admin_operasional",
            secondaryRoles: ["super_admin"],
          },
        });
        const res = await deleteHandler();
        expect(res.status).toBe(200);
      });

      it("rejects access (403) if secondaryRoles only has admin_operasional", async () => {
        mockAuth.mockResolvedValue({
          user: {
            id: "u-sec-ops",
            role: "admin_pembayaran",
            secondaryRoles: ["admin_operasional"],
          },
        });
        const res = await deleteHandler();
        expect(res.status).toBe(403);
      });

      it("returns 401 when there is no active session", async () => {
        mockAuth.mockResolvedValue(null);
        const res = await deleteHandler();
        expect(res.status).toBe(401);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // (5) ocrProviderRepo.findAll() tetap mengembalikan apiKey mentah
  // ──────────────────────────────────────────────────────────
  describe("5. ocrProviderRepo.findAll() Preserves Raw apiKey for Server Pipelines", () => {
    it("returns raw unmasked apiKey so internal OCR gateway can authenticate with upstream APIs", async () => {
      mockPrismaFindMany.mockResolvedValue([sampleProviderDbRow]);

      const providers = await ocrProviderRepo.findAll();
      expect(providers).toHaveLength(1);
      const first = providers[0];
      expect(first).toBeDefined();
      if (!first) throw new Error("Provider not found");
      expect(first.apiKey).toBe("AIzaSyD-TEST-SECRET-12345678");
      // Must NOT be masked in repository layer
      expect(first.apiKey).not.toContain("••••");
    });
  });
});
