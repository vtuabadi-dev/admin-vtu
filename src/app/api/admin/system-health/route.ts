import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getMetrics } from "@/server/lib/metrics";

export async function GET() {
  const session = await auth();
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const health: Record<string, unknown> = {
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  // DB check
  try {
    const { prisma } = await import("@/server/db/client");
    await prisma.$queryRaw`SELECT 1`;
    health.database = { status: "connected" };
  } catch {
    health.database = { status: "disconnected" };
  }

  // Redis check
  try {
    const { connection } = await import("@/server/queue/connection");
    const redis = connection as any;
    if (redis.ping) {
      await redis.ping();
      health.redis = { status: "connected" };
    } else {
      health.redis = { status: "not_initialized" };
    }
  } catch {
    health.redis = { status: "disconnected" };
  }

  // Storage check
  try {
    const { getStorageAdapter } = await import("@/server/storage");
    getStorageAdapter();
    health.storage = { status: "available", type: process.env.AWS_REGION ? "s3" : "local" };
  } catch {
    health.storage = { status: "unavailable" };
  }

  // Queue stats
  try {
    const { getQueueStats } = await import("@/server/queue");
    const queues = ["document-ocr", "payment-reminder", "export-generator", "notification-dispatch", "cleanup-temp", "backup-database", "manifest-generate"];
    const queueStatus: Record<string, unknown> = {};
    for (const q of queues) {
      queueStatus[q] = await getQueueStats(q as any);
    }
    health.queues = queueStatus;
  } catch {
    health.queues = { status: "unavailable" };
  }

  // Metrics
  health.metrics = getMetrics();

  return NextResponse.json({ success: true, data: health });
}
