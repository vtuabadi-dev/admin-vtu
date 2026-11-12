import { prisma } from "@/server/db/client";
import { auditRepo } from "@/server/repositories/audit.repository";
import {
  computeBillingItemsDiff,
  formatBillingDiffSummary,
  getEventKindDisplay,
  inferManifestImpactLabels,
} from "@/shared/lib/invoice-audit-log";
import type {
  BillingItemDelta,
  BillingItemSnapshot,
  InvoiceAuditEventKind,
  OperationalRole,
} from "@/shared/types";

const VALID_ROLES = new Set<string>([
  "super_admin",
  "admin_operasional",
  "admin_pembayaran",
  "admin_manifest",
  "admin_dokumen",
  "admin_badal",
  "tour_leader",
  "jamaah",
]);

function normalizeRole(role?: string | null): OperationalRole {
  if (role && VALID_ROLES.has(role)) return role as OperationalRole;
  return "super_admin";
}

export async function resolveAuditActor(override?: {
  userId?: string;
  userName?: string;
  role?: string | null;
}) {
  if (override?.userName) {
    return {
      userId: override.userId || "system",
      userName: override.userName,
      role: normalizeRole(override.role),
    };
  }
  try {
    // Dynamic import avoids pulling next-auth / next/server into Vitest unit modules at load time
    const { auth } = await import("@/server/auth");
    const session = await auth();
    if (session?.user) {
      return {
        userId: session.user.id || "system",
        userName: session.user.name || session.user.email || "Admin",
        role: normalizeRole((session.user as any).role),
      };
    }
  } catch {
    // Non-request context fallback
  }
  return {
    userId: "system",
    userName: "Admin Operasional",
    role: "super_admin" as OperationalRole,
  };
}

/**
 * Extracts active billing items from a group's loaded invoices (excluding payment metadata rows).
 */
export function collectActiveBillingSnapshots(invoices?: any[]): BillingItemSnapshot[] {
  if (!Array.isArray(invoices)) return [];
  const snapshots: BillingItemSnapshot[] = [];
  for (const inv of invoices) {
    if (!inv || inv.status === "cancelled") continue;
    for (const it of inv.items || []) {
      if (!it || it.status === "cancelled") continue;
      const katLower = String(it.kategori || "").toLowerCase();
      if (katLower === "cicilan_dibayar" || katLower === "pembayaran" || katLower === "dp") {
        continue;
      }
      snapshots.push({
        id: it.id,
        kategori: it.kategori || "Tagihan",
        deskripsi: it.deskripsi || "",
        qty: Number(it.qty || 1),
        hargaSatuan: Number(it.hargaSatuan || 0),
        jumlah: Number(it.jumlah || 0),
        status: it.status || "active",
      });
    }
  }
  return snapshots;
}

export interface RecordInvoiceAuditInput {
  groupId: string;
  kodeRegistrasi?: string;
  namaGroup?: string;
  namaPaket?: string;
  invoiceId?: string;
  nomorInvoice?: string;
  eventKind: InvoiceAuditEventKind;
  action: string;
  title?: string;
  detail?: string;
  beforeTotal?: number;
  afterTotal?: number;
  beforeItems?: BillingItemSnapshot[];
  afterItems?: BillingItemSnapshot[];
  itemsDiff?: BillingItemDelta[];
  manifestImpact?: string[];
  catatan?: string;
  extraBefore?: Record<string, any>;
  extraAfter?: Record<string, any>;
  actorOverride?: {
    userId?: string;
    userName?: string;
    role?: string | null;
  };
}

export async function recordInvoiceAuditLog(input: RecordInvoiceAuditInput) {
  try {
    const actor = await resolveAuditActor(input.actorOverride);

    let itemsDiff = input.itemsDiff;
    let deltaTotal =
      typeof input.beforeTotal === "number" && typeof input.afterTotal === "number"
        ? input.afterTotal - input.beforeTotal
        : undefined;

    if (!itemsDiff && input.beforeItems && input.afterItems) {
      const diffRes = computeBillingItemsDiff(input.beforeItems, input.afterItems);
      itemsDiff = diffRes.itemsDiff;
      if (deltaTotal === undefined) {
        deltaTotal = diffRes.deltaTotal;
      }
    }

    const display = getEventKindDisplay(input.eventKind);
    const title = input.title || display.label;
    const summaryText =
      input.detail ||
      formatBillingDiffSummary(itemsDiff || [], input.beforeTotal, input.afterTotal);

    const manifestImpact =
      input.manifestImpact && input.manifestImpact.length > 0
        ? input.manifestImpact
        : inferManifestImpactLabels(
            [
              ...(input.afterItems || []),
              ...(itemsDiff || []).map((d) => ({ kategori: d.kategori, deskripsi: d.deskripsi })),
              { deskripsi: summaryText, kategori: input.eventKind },
            ],
            input.eventKind
          );

    const beforePayload = {
      groupId: input.groupId,
      kodeRegistrasi: input.kodeRegistrasi,
      namaGroup: input.namaGroup,
      totalTagihan: input.beforeTotal,
      items: input.beforeItems,
      ...(input.extraBefore || {}),
    };

    const afterPayload = {
      groupId: input.groupId,
      kodeRegistrasi: input.kodeRegistrasi,
      namaGroup: input.namaGroup,
      namaPaket: input.namaPaket,
      invoiceId: input.invoiceId,
      nomorInvoice: input.nomorInvoice,
      eventKind: input.eventKind,
      title,
      totalTagihan: input.afterTotal,
      deltaTotal,
      itemsDiff: itemsDiff || [],
      manifestImpact,
      catatan: input.catatan,
      ...(input.extraAfter || {}),
    };

    return await auditRepo.create({
      userId: actor.userId,
      userName: actor.userName,
      role: actor.role,
      module: "pembayaran",
      action: input.action,
      detail: summaryText,
      entityId: input.groupId,
      entityType: "invoice_revision",
      before: JSON.stringify(beforePayload),
      after: JSON.stringify(afterPayload),
    });
  } catch (err) {
    console.warn("[InvoiceAudit] Non-blocking audit write warning:", err);
    return null;
  }
}

export async function fetchInvoiceAuditEntries(params?: {
  groupId?: string;
  limit?: number;
}) {
  try {
    const where: any = {
      OR: [
        { module: "pembayaran" },
        { entityType: { in: ["invoice_revision", "invoice", "Pembayaran"] } },
      ],
    };
    if (params?.groupId) {
      where.entityId = params.groupId;
    }
    return await prisma.auditEntry.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: params?.limit ?? 200,
    });
  } catch (err) {
    console.warn("[InvoiceAudit] Read audit entries warning:", err);
    return [];
  }
}

