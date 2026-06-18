// Centralized health check aggregator — VTU Core (simplified)
// Database + Storage + Disk + Operational diagnostics only.

import { prisma } from "@/server/db/client";
import { getStorageAdapter } from "@/server/storage";
import { getMetrics } from "@/server/lib/metrics";
import { execSync } from "child_process";
import path from "path";
import os from "os";

// ── Types ──────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface OperationalDiagnostic {
  label: string;
  status: "ok" | "warning" | "critical";
  count: number;
  detail?: string;
}

export interface HealthReport {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  infrastructure: {
    database: { status: "connected" | "disconnected"; error?: string };
    storage: { status: "available" | "unavailable"; type: "local" | "s3"; error?: string };
    disk: { status: "ok" | "warning" | "critical"; usedPercent: number; freeBytes: number; totalBytes: number };
  };
  metrics: ReturnType<typeof getMetrics>;
  operational: OperationalDiagnostic[];
}

// ── Individual checks ─────────────────────────────────────────────

export async function checkDatabaseHealth(): Promise<{
  status: "connected" | "disconnected";
  error?: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (err) {
    return { status: "disconnected", error: (err as Error).message };
  }
}

export async function checkStorageHealth(): Promise<{
  status: "available" | "unavailable";
  type: "local" | "s3";
  error?: string;
}> {
  try {
    getStorageAdapter();
    const type = process.env.AWS_REGION ? "s3" : "local";
    return { status: "available", type };
  } catch (err) {
    const type = process.env.AWS_REGION ? "s3" : "local";
    return { status: "unavailable", type, error: (err as Error).message };
  }
}

export async function checkDiskUsage(): Promise<{
  status: "ok" | "warning" | "critical";
  usedPercent: number;
  freeBytes: number;
  totalBytes: number;
}> {
  const storagePath = process.env.STORAGE_PATH || "./storage";

  try {
    let totalBytes = 0;
    let freeBytes = 0;

    if (process.platform === "win32") {
      const driveRoot = path.parse(storagePath).root;
      const cwdFirstChar = process.cwd().charAt(0);
      const driveLetter = driveRoot
        ? driveRoot.replace("\\", "")
        : (cwdFirstChar || "C") + ":";

      const output = execSync(
        `wmic logicaldisk where caption='${driveLetter}' get size,freespace /format:csv`,
        { encoding: "utf8", timeout: 5000 },
      );

      const lines = output.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length > 1) {
        const dataLine = lines[1];
        if (dataLine) {
          const parts = dataLine.split(",");
          if (parts.length >= 3) {
            freeBytes = parseInt(parts[1]!, 10) || 0;
            totalBytes = parseInt(parts[2]!, 10) || 0;
          }
        }
      }
    } else {
      const output = execSync(`df -k "${storagePath}"`, {
        encoding: "utf8",
        timeout: 5000,
      });

      const lines = output.trim().split("\n");
      if (lines.length > 1) {
        const dataLine = lines[1];
        if (dataLine) {
          const parts = dataLine.split(/\s+/);
          if (parts.length >= 4) {
            const totalBlocks = parseInt(parts[1]!, 10);
            const availableBlocks = parseInt(parts[3]!, 10);
            totalBytes = Number.isFinite(totalBlocks) ? totalBlocks * 1024 : 0;
            freeBytes = Number.isFinite(availableBlocks) ? availableBlocks * 1024 : 0;
          }
        }
      }
    }

    if (totalBytes === 0) {
      totalBytes = os.totalmem();
      freeBytes = os.freemem();
    }

    const usedBytes = totalBytes - freeBytes;
    const usedPercent =
      totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    let status: "ok" | "warning" | "critical";
    if (usedPercent >= 95) status = "critical";
    else if (usedPercent >= 85) status = "warning";
    else status = "ok";

    return { status, usedPercent, freeBytes, totalBytes };
  } catch {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100);
    return { status: "ok", usedPercent, freeBytes, totalBytes };
  }
}

// ── Operational diagnostics ──────────────────────────────────────

const STUCK_REGISTRATION_DAYS = 7;
const OVERDUE_WARNING_COUNT = 5;

export async function checkOperationalDiagnostics(): Promise<OperationalDiagnostic[]> {
  const diagnostics: OperationalDiagnostic[] = [];

  try {
    // 1. Stuck registrations
    const stuckDate = new Date(Date.now() - STUCK_REGISTRATION_DAYS * 86400000);
    const stuckCount = await prisma.registrationRequest.count({
      where: { status: "PENDING_REVIEW", createdAt: { lt: stuckDate } },
    });
    diagnostics.push({
      label: "Stuck Registrations (PENDING_REVIEW > 7 days)",
      status: stuckCount > 5 ? "critical" : stuckCount > 0 ? "warning" : "ok",
      count: stuckCount,
      detail: stuckCount > 0 ? `${stuckCount} registrations awaiting review for >7 days` : undefined,
    });

    // 2. Overdue invoices
    const overdueCount = await prisma.invoice.count({
      where: { status: "overdue" },
    });
    diagnostics.push({
      label: "Overdue Invoices",
      status: overdueCount > OVERDUE_WARNING_COUNT ? "critical" : overdueCount > 0 ? "warning" : "ok",
      count: overdueCount,
      detail: overdueCount > 0 ? `${overdueCount} invoices past due date` : undefined,
    });

    // 3. Jamaah without verified passport
    const incompleteDocs = await prisma.dokumenItem.count({
      where: {
        jenis: "paspor",
        status: { in: ["pending", "rejected"] },
        jamaah: { status: { notIn: ["batal"] } },
      },
    });
    diagnostics.push({
      label: "Jamaah Without Verified Passport",
      status: incompleteDocs > 20 ? "critical" : incompleteDocs > 5 ? "warning" : "ok",
      count: incompleteDocs,
      detail: incompleteDocs > 0 ? `${incompleteDocs} active jamaah missing verified passport` : undefined,
    });

    // 4. DP invoices past due
    const dpOverdue = await prisma.invoice.count({
      where: {
        tipe: "dp",
        status: { in: ["unpaid", "overdue"] },
        jatuhTempo: { lt: new Date() },
      },
    });
    diagnostics.push({
      label: "DP Invoices Past Due Date",
      status: dpOverdue > 10 ? "critical" : dpOverdue > 0 ? "warning" : "ok",
      count: dpOverdue,
      detail: dpOverdue > 0 ? `${dpOverdue} DP invoices past due date and unpaid` : undefined,
    });

    // 5. Groups with zero payment after 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const unpaidGroups = await prisma.registrationGroup.count({
      where: {
        totalPembayaran: 0,
        status: "active",
        createdAt: { lt: fourteenDaysAgo },
      },
    });
    diagnostics.push({
      label: "Groups With No Payment After 14 Days",
      status: unpaidGroups > 5 ? "warning" : "ok",
      count: unpaidGroups,
      detail: unpaidGroups > 0 ? `${unpaidGroups} active groups with zero payment after 14 days` : undefined,
    });

    // 6. Expired passports
    const expiredPassports = await prisma.dokumenItem.count({
      where: {
        jenis: "paspor",
        status: "verified",
        jamaah: {
          status: { notIn: ["batal"] },
          masaBerlakuPaspor: { lt: new Date() },
        },
      },
    });
    diagnostics.push({
      label: "Expired Passports (Active Jamaah)",
      status: expiredPassports > 5 ? "critical" : expiredPassports > 0 ? "warning" : "ok",
      count: expiredPassports,
      detail: expiredPassports > 0 ? `${expiredPassports} active jamaah with expired passports` : undefined,
    });

    // 7. Duplicate passport numbers
    const duplicatePassports = await prisma.$queryRaw<{ nomorPaspor: string; count: bigint }[]>`
      SELECT "nomorPaspor", COUNT(*) as count FROM jamaah
      WHERE "nomorPaspor" != '' AND status != 'batal'
      GROUP BY "nomorPaspor" HAVING COUNT(*) > 1
    `;
    diagnostics.push({
      label: "Duplicate Passport Numbers",
      status: duplicatePassports.length > 0 ? "critical" : "ok",
      count: duplicatePassports.length,
      detail: duplicatePassports.length > 0 ? `${duplicatePassports.length} passport numbers used by multiple active jamaah` : undefined,
    });

    // 8. Unreviewed uploads > 7 days
    const unreviewedDate = new Date(Date.now() - 7 * 86400000);
    const unreviewedUploads = await prisma.dokumenItem.count({
      where: { status: "pending", uploadedAt: { lt: unreviewedDate } },
    });
    diagnostics.push({
      label: "Unreviewed Document Uploads (>7 days)",
      status: unreviewedUploads > 20 ? "critical" : unreviewedUploads > 5 ? "warning" : "ok",
      count: unreviewedUploads,
      detail: unreviewedUploads > 0 ? `${unreviewedUploads} document uploads awaiting review for >7 days` : undefined,
    });

    // 9. Passports expiring within 3 months
    const threeMonthsFromNow = new Date(Date.now() + 90 * 86400000);
    const expiringPassports = await prisma.jamaah.count({
      where: {
        status: { notIn: ["batal", "berangkat"] },
        masaBerlakuPaspor: { gt: new Date(), lt: threeMonthsFromNow },
      },
    });
    diagnostics.push({
      label: "Passports Expiring Within 3 Months",
      status: expiringPassports > 10 ? "warning" : expiringPassports > 0 ? "warning" : "ok",
      count: expiringPassports,
      detail: expiringPassports > 0 ? `${expiringPassports} active jamaah with passports expiring within 3 months` : undefined,
    });
  } catch (err) {
    diagnostics.push({
      label: "Operational Diagnostics",
      status: "critical",
      count: 0,
      detail: `Failed to run diagnostics: ${(err as Error).message}`,
    });
  }

  return diagnostics;
}

// ── Aggregated report ─────────────────────────────────────────────

export async function getHealthReport(): Promise<HealthReport> {
  const [database, storage, disk, operational] = await Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
    checkDiskUsage(),
    checkOperationalDiagnostics(),
  ]);

  let status: HealthStatus = "healthy";

  if (database.status === "disconnected") {
    status = "unhealthy";
  } else {
    const storageDegraded = storage.status === "unavailable";
    const operationalCritical = operational.some((d) => d.status === "critical");

    if (storageDegraded || operationalCritical) {
      status = "degraded";
    }
  }

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    infrastructure: { database, storage, disk },
    metrics: getMetrics(),
    operational,
  };
}
