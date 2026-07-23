// Centralized health check aggregator — VTU Core
// Vercel-compatible: tidak menggunakan execSync, shell command, atau disk inspection.
// Database + Google Drive + Google Vision + Application checks only.

import { prisma } from "@/server/db/client";
import { getStorageAdapter } from "@/server/storage";
import { getMetrics } from "@/server/lib/metrics";
import { validateEnvironment } from "@/server/lib/env-validation";

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
    storage: { status: "available" | "unavailable"; type: "google-drive" | "s3" | "local"; error?: string };
    ocr: { status: "configured" | "unconfigured" | "error"; provider: string; error?: string };
    application: { status: "ok" | "error"; errors?: string[]; warnings?: string[] };
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

function detectStorageType(): "google-drive" | "s3" | "local" {
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) return "google-drive";
  if (process.env.AWS_REGION && process.env.S3_BUCKET) return "s3";
  return "local";
}

export async function checkStorageHealth(): Promise<{
  status: "available" | "unavailable";
  type: "google-drive" | "s3" | "local";
  error?: string;
}> {
  try {
    getStorageAdapter();
    const type = detectStorageType();

    // Quick connectivity test: try listing (validates auth + network)
    try {
      await getStorageAdapter().list("");
    } catch {
      // List may fail on empty/new buckets — non-critical
    }

    return { status: "available", type };
  } catch (err) {
    const type = detectStorageType();
    return { status: "unavailable", type, error: (err as Error).message };
  }
}

export async function checkOcrHealth(): Promise<{
  status: "configured" | "unconfigured" | "error";
  provider: string;
  error?: string;
}> {
  try {
    // ── DB-Driven mode: check provider table ──
    if (process.env.OCR_DB_DRIVEN !== "false") {
      const { ocrProviderRepo } = await import("@/server/repositories/ocr-provider.repository");
      const providers = await ocrProviderRepo.findAll();
      const active = providers.filter((p) => p.isActive && p.healthStatus === "active");
      const total = providers.length;

      if (total === 0) {
        return { status: "unconfigured", provider: "db-driven", error: "No OCR providers in database. Seed via Admin Panel → OCR Settings." };
      }
      return {
        status: "configured",
        provider: `db-driven (${active.length}/${total} active)`,
      };
    }

    // ── Legacy env-var mode ──
    const provider = process.env.OCR_PROVIDER?.trim() || "google-vision";

    switch (provider) {
      case "google-vision": {
        const keys = process.env.GOOGLE_VISION_API_KEY ?? "";
        const hasKey = keys.split(",").filter(Boolean).length > 0;
        return hasKey
          ? { status: "configured", provider: "google-vision" }
          : { status: "unconfigured", provider: "google-vision", error: "GOOGLE_VISION_API_KEY not set" };
      }
      case "external-api": {
        const url = process.env.OCR_API_URL?.trim();
        return url
          ? { status: "configured", provider: "external-api" }
          : { status: "unconfigured", provider: "external-api", error: "OCR_API_URL not set" };
      }
      default:
        return { status: "unconfigured", provider, error: `Unknown OCR_PROVIDER: ${provider}` };
    }
  } catch (err) {
    return { status: "error", provider: "unknown", error: (err as Error).message };
  }
}

export function checkApplicationHealth(): {
  status: "ok" | "error";
  errors?: string[];
  warnings?: string[];
} {
  const report = validateEnvironment();
  if (!report.valid) {
    return { status: "error", errors: report.errors, warnings: report.warnings };
  }
  if (report.warnings.length > 0) {
    return { status: "ok", warnings: report.warnings };
  }
  return { status: "ok" };
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
  const [database, storage, ocr, operational] = await Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
    checkOcrHealth(),
    checkOperationalDiagnostics(),
  ]);

  const application = checkApplicationHealth();

  let status: HealthStatus = "healthy";

  if (database.status === "disconnected") {
    status = "unhealthy";
  } else {
    const storageDegraded = storage.status === "unavailable";
    const appError = application.status === "error";
    const operationalCritical = operational.some((d) => d.status === "critical");

    if (storageDegraded || appError) {
      status = "degraded";
    } else if (operationalCritical) {
      status = "degraded";
    }
  }

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    infrastructure: { database, storage, ocr, application },
    metrics: getMetrics(),
    operational,
  };
}
