// ============================================================
// OCR Provider Repository — DB operations for OCR Gateway
// ============================================================

import { prisma } from "@/server/db/client";
import type {
  OcrProviderRecord,
  OcrProviderCreateInput,
  OcrProviderUpdateInput,
  UsageLogEntry,
  UsageLogFilter,
  ProviderStats,
  OcrStatsSummary,
  CacheStats,
} from "@/server/services/ocr/types";

// ── Helpers ──────────────────────────────────────────────

function mapProvider(row: any): OcrProviderRecord {
  return {
    id: row.id,
    label: row.label,
    providerType: row.providerType as OcrProviderRecord["providerType"],
    apiKey: row.apiKey,
    apiUrl: row.apiUrl ?? null,
    apiHeaderName: row.apiHeaderName ?? null,
    apiHeaderPrefix: row.apiHeaderPrefix ?? null,
    isActive: row.isActive,
    rotationOrder: row.rotationOrder,
    rotationCount: row.rotationCount,
    requestCounter: row.requestCounter,
    dailyUsage: row.dailyUsage,
    dailyLimit: row.dailyLimit ?? null,
    healthStatus: row.healthStatus as OcrProviderRecord["healthStatus"],
    cooldownUntil: row.cooldownUntil?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    lastErrorAt: row.lastErrorAt?.toISOString() ?? null,
    lastErrorMsg: row.lastErrorMsg ?? null,
    consecutiveErrors: row.consecutiveErrors,
    successRate: row.successRate,
    totalRequests: row.totalRequests,
    totalErrors: row.totalErrors,
    averageLatencyMs: row.averageLatencyMs,
    totalPages: row.totalPages,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapUsageLog(row: any): UsageLogEntry {
  return {
    id: row.id,
    providerId: row.providerId,
    providerLabel: row.provider?.label ?? null,
    requestType: row.requestType,
    documentType: row.documentType ?? null,
    success: row.success,
    confidence: row.confidence ?? null,
    latencyMs: row.latencyMs,
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage ?? null,
    imageHash: row.imageHash ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Provider CRUD ────────────────────────────────────────

export const ocrProviderRepo = {
  async findAll(): Promise<OcrProviderRecord[]> {
    const rows = await prisma.ocrProvider.findMany({
      orderBy: [{ isActive: "desc" }, { rotationOrder: "asc" }],
    });
    return rows.map(mapProvider);
  },

  async findActive(): Promise<OcrProviderRecord[]> {
    const rows = await prisma.ocrProvider.findMany({
      where: { isActive: true, healthStatus: { notIn: ["disabled", "error"] } },
      orderBy: { rotationOrder: "asc" },
    });
    return rows.map(mapProvider);
  },

  async findById(id: string): Promise<OcrProviderRecord | null> {
    const row = await prisma.ocrProvider.findUnique({ where: { id } });
    return row ? mapProvider(row) : null;
  },

  async create(input: OcrProviderCreateInput): Promise<OcrProviderRecord> {
    // Auto-assign rotation order to the end
    const maxOrder = await prisma.ocrProvider.aggregate({ _max: { rotationOrder: true } });
    const nextOrder = (maxOrder._max.rotationOrder ?? -1) + 1;

    const row = await prisma.ocrProvider.create({
      data: {
        label: input.label,
        providerType: input.providerType,
        apiKey: input.apiKey,
        apiUrl: input.apiUrl ?? null,
        apiHeaderName: input.apiHeaderName ?? null,
        apiHeaderPrefix: input.apiHeaderPrefix ?? null,
        rotationOrder: input.rotationOrder ?? nextOrder,
        rotationCount: input.rotationCount ?? 2,
        dailyLimit: input.dailyLimit ?? null,
        notes: input.notes ?? null,
      },
    });
    return mapProvider(row);
  },

  async update(id: string, input: OcrProviderUpdateInput): Promise<OcrProviderRecord> {
    const data: Record<string, any> = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.providerType !== undefined) data.providerType = input.providerType;
    if (input.apiKey !== undefined) data.apiKey = input.apiKey;
    if (input.apiUrl !== undefined) data.apiUrl = input.apiUrl;
    if (input.apiHeaderName !== undefined) data.apiHeaderName = input.apiHeaderName;
    if (input.apiHeaderPrefix !== undefined) data.apiHeaderPrefix = input.apiHeaderPrefix;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.rotationOrder !== undefined) data.rotationOrder = input.rotationOrder;
    if (input.rotationCount !== undefined) data.rotationCount = input.rotationCount;
    if (input.dailyLimit !== undefined) data.dailyLimit = input.dailyLimit;
    if (input.notes !== undefined) data.notes = input.notes;

    const row = await prisma.ocrProvider.update({ where: { id }, data });
    return mapProvider(row);
  },

  async delete(id: string): Promise<void> {
    await prisma.ocrProvider.delete({ where: { id } });
  },

  async toggleActive(id: string): Promise<OcrProviderRecord> {
    const current = await prisma.ocrProvider.findUnique({ where: { id } });
    if (!current) throw new Error(`Provider ${id} not found`);

    // Prevent disabling the last active provider
    if (current.isActive) {
      const activeCount = await prisma.ocrProvider.count({
        where: { isActive: true, healthStatus: { notIn: ["disabled", "error"] } },
      });
      if (activeCount <= 1) {
        throw new Error("Tidak dapat menonaktifkan provider terakhir yang aktif.");
      }
    }

    const row = await prisma.ocrProvider.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
    return mapProvider(row);
  },

  // ── Runtime Operations (called by gateway) ─────────────

  async incrementCounter(id: string): Promise<void> {
    await prisma.ocrProvider.update({
      where: { id },
      data: {
        requestCounter: { increment: 1 },
        dailyUsage: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  },

  async resetCounter(id: string): Promise<void> {
    await prisma.ocrProvider.update({
      where: { id },
      data: { requestCounter: 0 },
    });
  },

  async updateHealth(
    id: string,
    updates: {
      healthStatus?: string;
      cooldownUntil?: Date | null;
      lastErrorAt?: Date;
      lastErrorMsg?: string;
      consecutiveErrors?: number;
    },
  ): Promise<void> {
    await prisma.ocrProvider.update({ where: { id }, data: updates as any });
  },

  async recordSuccess(
    id: string,
    latencyMs: number,
    currentSuccessRate: number,
    currentAvgLatency: number,
    currentTotal: number,
  ): Promise<void> {
    const newTotal = currentTotal + 1;
    const newSuccessRate = (currentSuccessRate * currentTotal + 1) / newTotal;
    const newAvgLatency = (currentAvgLatency * currentTotal + latencyMs) / newTotal;

    await prisma.ocrProvider.update({
      where: { id },
      data: {
        successRate: newSuccessRate,
        averageLatencyMs: newAvgLatency,
        totalRequests: newTotal,
        totalPages: { increment: 1 },
        consecutiveErrors: 0,
        healthStatus: "active",
        cooldownUntil: null,
        lastErrorAt: null,
        lastErrorMsg: null,
      },
    });
  },

  async recordError(
    id: string,
    latencyMs: number,
    currentSuccessRate: number,
    currentAvgLatency: number,
    currentTotal: number,
    _errorCode?: string,
    errorMsg?: string,
  ): Promise<void> {
    const newTotal = currentTotal + 1;
    const newSuccessRate = (currentSuccessRate * currentTotal) / newTotal;
    const newAvgLatency = (currentAvgLatency * currentTotal + latencyMs) / newTotal;

    await prisma.ocrProvider.update({
      where: { id },
      data: {
        successRate: newSuccessRate,
        averageLatencyMs: newAvgLatency,
        totalRequests: newTotal,
        totalErrors: { increment: 1 },
        consecutiveErrors: { increment: 1 },
        lastErrorAt: new Date(),
        lastErrorMsg: errorMsg ?? null,
      },
    });
  },

  async resetDailyIfNewDay(id: string, lastUsedAt: string | null): Promise<boolean> {
    if (!lastUsedAt) return false;

    const lastDate = new Date(lastUsedAt);
    const now = new Date();

    // Compare date portions only
    const isNewDay =
      lastDate.getUTCFullYear() !== now.getUTCFullYear() ||
      lastDate.getUTCMonth() !== now.getUTCMonth() ||
      lastDate.getUTCDate() !== now.getUTCDate();

    if (isNewDay) {
      await prisma.ocrProvider.update({
        where: { id },
        data: { dailyUsage: 0 },
      });
      return true;
    }
    return false;
  },

  // ── Usage Log ─────────────────────────────────────────

  async createUsageLog(entry: {
    providerId: string;
    requestType?: string;
    documentType?: string;
    success: boolean;
    confidence?: number;
    latencyMs: number;
    errorCode?: string;
    errorMessage?: string;
    imageHash?: string;
    imageSize?: number;
    metadata?: any;
  }): Promise<void> {
    await prisma.ocrUsageLog.create({ data: entry as any });
  },

  async getUsageLogs(filter: UsageLogFilter): Promise<{ data: UsageLogEntry[]; total: number }> {
    const where: Record<string, any> = {};
    if (filter.providerId) where.providerId = filter.providerId;
    if (filter.success !== undefined) where.success = filter.success;
    if (filter.documentType) where.documentType = filter.documentType;
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 25;

    const [rows, total] = await Promise.all([
      prisma.ocrUsageLog.findMany({
        where,
        include: { provider: { select: { label: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ocrUsageLog.count({ where }),
    ]);

    return { data: rows.map(mapUsageLog), total };
  },

  // ── Statistics ────────────────────────────────────────

  async getProviderStats(): Promise<ProviderStats[]> {
    const providers = await prisma.ocrProvider.findMany({
      orderBy: { rotationOrder: "asc" },
    });

    return providers.map((p) => ({
      providerId: p.id,
      label: p.label,
      providerType: p.providerType as ProviderStats["providerType"],
      healthStatus: p.healthStatus as ProviderStats["healthStatus"],
      cooldownUntil: p.cooldownUntil?.toISOString() ?? null,
      isActive: p.isActive,
      totalRequests: p.totalRequests,
      totalErrors: p.totalErrors,
      successRate: p.successRate,
      averageLatencyMs: p.averageLatencyMs,
      dailyUsage: p.dailyUsage,
      dailyLimit: p.dailyLimit,
      lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
      rotationOrder: p.rotationOrder,
    }));
  },

  async getSummaryStats(): Promise<OcrStatsSummary> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [activeCount, allCount, todayStats] = await Promise.all([
      prisma.ocrProvider.count({ where: { isActive: true } }),
      prisma.ocrProvider.count(),
      (async () => {
        const [success, total, avgResult] = await Promise.all([
          prisma.ocrUsageLog.count({ where: { createdAt: { gte: today }, success: true } }),
          prisma.ocrUsageLog.count({ where: { createdAt: { gte: today } } }),
          prisma.ocrUsageLog.aggregate({ _avg: { latencyMs: true }, where: { createdAt: { gte: today } } }),
        ]);
        return { success, total, avgLatency: avgResult._avg.latencyMs ?? 0 };
      })(),
    ]);

    return {
      totalProviders: allCount,
      activeProviders: activeCount,
      totalRequestsToday: todayStats.total,
      totalErrorsToday: todayStats.total - todayStats.success,
      successRateToday: todayStats.total > 0 ? todayStats.success / todayStats.total : 0,
      averageLatencyToday: todayStats.avgLatency,
      cacheHitRate: 0,
    };
  },

  // ── Cache Operations ─────────────────────────────────

  async findCacheEntry(imageHash: string): Promise<{
    id: string;
    result: any;
    confidence: number;
    expiresAt: Date;
    accessCount: number;
  } | null> {
    const entry = await prisma.ocrCacheEntry.findUnique({ where: { imageHash } });
    if (!entry) return null;

    // Check expiry
    if (entry.expiresAt < new Date()) {
      // Expired — delete and return null
      await prisma.ocrCacheEntry.delete({ where: { id: entry.id } }).catch(() => {});
      return null;
    }

    // Update access
    await prisma.ocrCacheEntry.update({
      where: { id: entry.id },
      data: { lastAccessedAt: new Date(), accessCount: { increment: 1 } },
    });

    return {
      id: entry.id,
      result: entry.result,
      confidence: entry.confidence,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount + 1,
    };
  },

  async storeCacheEntry(entry: {
    imageHash: string;
    documentType: string;
    result: any;
    confidence: number;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.ocrCacheEntry.upsert({
      where: { imageHash: entry.imageHash },
      create: {
        imageHash: entry.imageHash,
        documentType: entry.documentType as any,
        result: entry.result,
        confidence: entry.confidence,
        expiresAt: entry.expiresAt,
      },
      update: {
        result: entry.result,
        confidence: entry.confidence,
        expiresAt: entry.expiresAt,
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });
  },

  async getCacheStats(): Promise<CacheStats> {
    const [total, active, hitSum, missSum] = await Promise.all([
      prisma.ocrCacheEntry.count(),
      prisma.ocrCacheEntry.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.ocrCacheEntry.aggregate({ _sum: { accessCount: true } }),
      prisma.ocrCacheEntry.count(),
    ]);

    const hits = (hitSum._sum.accessCount ?? 0) - missSum;
    const totalAccesses = hitSum._sum.accessCount ?? 0;

    return {
      totalEntries: total,
      activeEntries: active,
      hitRate: totalAccesses > 0 ? Math.max(0, hits / totalAccesses) : 0,
      hits: Math.max(0, hits),
      misses: missSum,
    };
  },

  async flushExpiredCache(): Promise<number> {
    const result = await prisma.ocrCacheEntry.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },

  async flushAllCache(): Promise<number> {
    const result = await prisma.ocrCacheEntry.deleteMany();
    return result.count;
  },

  // ── Seed / Migration ─────────────────────────────────

  async seedFromEnvKeys(): Promise<number> {
    const existing = await prisma.ocrProvider.count();
    if (existing > 0) return 0; // Already seeded

    const keys: { label: string; key: string }[] = [];

    // Primary key (comma-separated)
    const mainKey = process.env.GOOGLE_VISION_API_KEY;
    if (mainKey) {
      const parts = mainKey.split(",").map((k) => k.trim()).filter(Boolean);
      parts.forEach((key, i) => {
        keys.push({ label: `Google Vision #${i + 1}`, key });
      });
    }

    // Additional keys (GOOGLE_VISION_API_KEY_2 ... _20)
    for (let i = 2; i <= 20; i++) {
      const extra = process.env[`GOOGLE_VISION_API_KEY_${i}`];
      if (extra?.trim()) {
        keys.push({ label: `Google Vision #${keys.length + 1}`, key: extra.trim() });
      }
    }

    if (keys.length === 0) return 0;

    await prisma.ocrProvider.createMany({
      data: keys.map((k, i) => ({
        label: k.label,
        providerType: "google_vision" as const,
        apiKey: k.key,
        rotationOrder: i,
        rotationCount: 2,
      })),
    });

    return keys.length;
  },
};
