// ============================================================
// API-FIRST HANDLERS — Try real API, fall back to mock data
// Phase 5: Client Migration
// ============================================================
// Each handler tries fetch() to the real API first.
// If the API is unreachable (dev without Docker/DB), it falls
// back to the in-memory mock data from data.ts.
// Function signatures preserved 1:1 — zero page changes.
// ============================================================
// TODO: Multi-tenant — add tenantId header to all fetch() calls
// ============================================================

import type {
  Jamaah,
  RegistrationGroup,
  Keberangkatan,
  Invoice,
  DokumenItem,
  DokumenJenis,
  Pembayaran,
  Manifest,
  Rooming,
  DashboardStats,
  OperationalAlert,
  Reminder,
  GroupPaymentSummary,
  InvoiceSplitConfig,
  JamaahReadinessResult,
  JamaahProgress,
  ManifestGeneratorConfig,
  ExportRequest,
  PackageIntelligence,
  OperationalMilestone,
  StatusJamaah,
  AuditEntry,
  ActivityEvent,
  AutoDeadline,
  FinalizationResult,
  PackageReadinessScore,
  GlobalSearchResult,
  OperationalRole,
  PermissionCheck,
  UploadResult,
} from "@/shared/types";
import {
  mockJamaah,
  mockGroups,
  mockKeberangkatan,
  mockInvoices,
  mockPembayaran,
  mockDashboardStats,
  mockAlerts,
  mockManifests,
  mockRoomings,
  mockReminders,
  mockPaymentSummaries,
  getInvoiceSplitConfig,
  createInvoiceSplitConfig,
} from "./data";
import { formatCurrency } from "@/shared/lib/utils";

import { validateJamaahReadiness } from "@/shared/lib/readiness-utils";
import { computeJamaahProgress } from "@/shared/lib/progress-utils";
import { generateManifestRows } from "@/shared/lib/manifest-utils";
import { generatePackageWarnings } from "@/shared/lib/warning-utils";
import { deriveAutoStatus } from "@/shared/lib/status-engine";
import { computeOperationalTimeline } from "@/shared/lib/timeline-utils";
import { computeDocumentCompleteness } from "@/shared/lib/document-utils";
import { canAccessModule } from "@/shared/lib/rbac-utils";
import { createAuditEntry } from "@/shared/lib/audit-utils";
import { computeAutoDeadlines } from "@/shared/lib/deadline-utils";
import { validateFinalization } from "@/shared/lib/finalization-utils";
import { computePackageReadinessScore } from "@/shared/lib/readiness-score";
import { globalSearch } from "@/shared/lib/search-utils";
import { useNotificationStore } from "@/stores/notification-store";

// ────────────────────────────────────────────────────────────
// API helpers
// ────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(path);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data as T;
    }
  } catch { /* offline — use fallback */ }
  return fallback();
}

async function apiPost<T>(path: string, body?: unknown, fallback?: () => T): Promise<T> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data as T;
    }
  } catch { /* offline */ }
  if (fallback) return fallback();
  throw new Error("API unavailable and no fallback provided");
}

async function apiPut<T>(path: string, body: unknown, fallback?: () => T): Promise<T> {
  try {
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json.data as T;
    }
  } catch { /* offline */ }
  if (fallback) return fallback();
  throw new Error("API unavailable and no fallback provided");
}

// ────────────────────────────────────────────────────────────
// JAMAAH
// ────────────────────────────────────────────────────────────

export async function getJamaahList(): Promise<Jamaah[]> {
  return apiGet("/api/jamaah", () => mockJamaah);
}

export async function getJamaahById(id: string): Promise<Jamaah | undefined> {
  return apiGet(`/api/jamaah/${id}`, () => mockJamaah.find((j) => j.id === id));
}

export async function getJamaahByGroup(groupId: string): Promise<Jamaah[]> {
  return apiGet(`/api/jamaah?groupId=${groupId}`, () => mockJamaah.filter((j) => j.groupId === groupId));
}

// ────────────────────────────────────────────────────────────
// REGISTRATION GROUPS
// ────────────────────────────────────────────────────────────

export async function getGroupList(): Promise<RegistrationGroup[]> {
  return apiGet("/api/groups", () => mockGroups);
}

export async function getGroupById(id: string): Promise<RegistrationGroup | undefined> {
  return apiGet(`/api/groups/${id}`, () => mockGroups.find((g) => g.id === id));
}

export async function getGroupByKode(kode: string): Promise<RegistrationGroup | undefined> {
  return apiGet("/api/groups", () => mockGroups.find((g) => g.kodeRegistrasi === kode));
}

// ────────────────────────────────────────────────────────────
// PAYMENT
// ────────────────────────────────────────────────────────────

export async function getGroupPaymentSummary(groupId: string): Promise<GroupPaymentSummary | undefined> {
  return apiGet(`/api/groups/${groupId}/payment`, () => mockPaymentSummaries.find((s) => s.groupId === groupId));
}

export async function getAllPaymentSummaries(): Promise<GroupPaymentSummary[]> {
  return apiGet("/api/groups", () => mockPaymentSummaries);
}

export async function getPembayaranByGroup(groupId: string): Promise<Pembayaran[]> {
  return apiGet(`/api/pembayaran?groupId=${groupId}`, () => mockPembayaran.filter((p) => p.groupId === groupId));
}

export async function getPembayaranList(): Promise<Pembayaran[]> {
  return apiGet("/api/pembayaran", () => mockPembayaran);
}

export async function getPembayaranByJamaah(jamaahId: string): Promise<Pembayaran[]> {
  const jamaah = mockJamaah.find((j) => j.id === jamaahId);
  if (!jamaah) return [];
  return apiGet(`/api/pembayaran?groupId=${jamaah.groupId}`, () =>
    mockPembayaran.filter((p) => p.groupId === jamaah.groupId)
  );
}

export async function addPembayaran(data: Omit<Pembayaran, "id" | "status" | "verifiedBy" | "reviewedBy" | "reviewedAt">): Promise<Pembayaran> {
  return apiPost("/api/pembayaran", data, () => {
    const newPembayaran: Pembayaran = {
      ...data,
      id: `byr-${Date.now()}`,
      status: data.sumber === "admin" ? "verified" : "pending",
      verifiedBy: data.sumber === "admin" ? "Admin (Auto)" : undefined,
    };
    mockPembayaran.push(newPembayaran);
    return newPembayaran;
  });
}

// ────────────────────────────────────────────────────────────
// KEBERANGKATAN
// ────────────────────────────────────────────────────────────

export async function getKeberangkatanList(): Promise<Keberangkatan[]> {
  return apiGet("/api/keberangkatan", () => mockKeberangkatan);
}

export async function getKeberangkatanById(id: string): Promise<Keberangkatan | undefined> {
  return apiGet(`/api/keberangkatan/${id}`, () => mockKeberangkatan.find((k) => k.id === id));
}

// ────────────────────────────────────────────────────────────
// DOKUMEN
// ────────────────────────────────────────────────────────────

export async function getDokumenByJamaah(jamaahId: string): Promise<DokumenItem[]> {
  return apiGet(`/api/dokumen?jamaahId=${jamaahId}`, () => {
    const jamaah = mockJamaah.find((j) => j.id === jamaahId);
    return jamaah?.dokumen ?? [];
  });
}

export async function updateDokumenStatus(
  dokumenId: string,
  status: DokumenItem["status"],
  catatan?: string
): Promise<DokumenItem | undefined> {
  return apiPut(`/api/dokumen/${dokumenId}/status`, { status, catatan }, () => {
    for (const j of mockJamaah) {
      const doc = j.dokumen.find((d) => d.id === dokumenId);
      if (doc) {
        doc.status = status;
        if (catatan !== undefined) doc.catatan = catatan;
        doc.verifiedAt = new Date().toISOString();
        if (status === "revisi" || status === "rejected") {
          const jenisLabel: Record<string, string> = {
            paspor: "Paspor", pas_foto: "Pas Foto", vaksin: "Vaksin",
            ktp: "KTP", kk: "KK", akta: "Akta",
          };
          const actionLabel = status === "revisi" ? "perlu direvisi" : "ditolak";
          const notifType = status === "revisi" ? "warning" as const : "error" as const;
          useNotificationStore.getState().addNotification({
            id: `notif-doc-${Date.now()}`,
            type: notifType,
            title: status === "revisi" ? "Dokumen Perlu Revisi" : "Dokumen Ditolak",
            message: `${jenisLabel[doc.jenis] ?? doc.jenis} Anda ${actionLabel}.${catatan ? ` Alasan: ${catatan}` : ""}`,
            link: "/jamaah/dokumen/upload",
            read: false,
            timestamp: new Date().toISOString(),
            category: "dokumen",
          });
        }
        return doc;
      }
    }
    return undefined;
  });
}

// ────────────────────────────────────────────────────────────
// INVOICE
// ────────────────────────────────────────────────────────────

export async function getInvoiceList(): Promise<Invoice[]> {
  return apiGet("/api/invoices", () => mockInvoices);
}

export async function getInvoiceByGroup(groupId: string): Promise<Invoice[]> {
  return apiGet(`/api/invoices?groupId=${groupId}`, () => mockInvoices.filter((inv) => inv.groupId === groupId));
}

export async function getInvoiceByJamaah(jamaahId: string): Promise<Invoice[]> {
  const jamaah = mockJamaah.find((j) => j.id === jamaahId);
  if (!jamaah) return [];
  return apiGet(`/api/invoices?groupId=${jamaah.groupId}`, () =>
    mockInvoices.filter((inv) => inv.groupId === jamaah.groupId)
  );
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  return apiGet(`/api/invoices/${id}`, () => mockInvoices.find((inv) => inv.id === id));
}

// ────────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiGet("/api/dashboard/stats", () => mockDashboardStats);
}

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  return apiGet("/api/dashboard/alerts", () => mockAlerts);
}

// ────────────────────────────────────────────────────────────
// MANIFEST
// ────────────────────────────────────────────────────────────

export async function getManifestList(): Promise<Manifest[]> {
  return apiGet("/api/manifests", () => mockManifests);
}

export async function getManifestById(id: string): Promise<Manifest | undefined> {
  return apiGet(`/api/manifests/${id}`, () => mockManifests.find((m) => m.id === id));
}

export async function getManifestByKeberangkatan(keberangkatanId: string): Promise<Manifest[]> {
  return apiGet(`/api/manifests?keberangkatanId=${keberangkatanId}`, () =>
    mockManifests.filter((m) => m.keberangkatanId === keberangkatanId)
  );
}

// ────────────────────────────────────────────────────────────
// ROOMING
// ────────────────────────────────────────────────────────────

export async function getRoomingList(): Promise<Rooming[]> {
  return apiGet("/api/roomings", () => mockRoomings);
}

export async function getRoomingById(id: string): Promise<Rooming | undefined> {
  return apiGet(`/api/roomings/${id}`, () => mockRoomings.find((r) => r.id === id));
}

export async function getRoomingByKeberangkatan(keberangkatanId: string): Promise<Rooming[]> {
  return apiGet(`/api/roomings?keberangkatanId=${keberangkatanId}`, () =>
    mockRoomings.filter((r) => r.keberangkatanId === keberangkatanId)
  );
}

// ────────────────────────────────────────────────────────────
// REMINDERS
// ────────────────────────────────────────────────────────────

export async function getReminderList(): Promise<Reminder[]> {
  return apiGet("/api/pengingat", () => mockReminders);
}

export async function getRemindersByGroup(groupId: string): Promise<Reminder[]> {
  return apiGet(`/api/pengingat?groupId=${groupId}`, () =>
    mockReminders.filter((r) => r.groupId === groupId)
  );
}

export async function getRemindersByJamaah(jamaahId: string): Promise<Reminder[]> {
  const jamaah = mockJamaah.find((j) => j.id === jamaahId);
  if (!jamaah) return [];
  return mockReminders.filter((r) => r.groupId === jamaah.groupId);
}

// ────────────────────────────────────────────────────────────
// SPLIT INVOICE
// ────────────────────────────────────────────────────────────

export async function fetchInvoiceSplitConfig(groupId: string): Promise<InvoiceSplitConfig | undefined> {
  return apiGet(`/api/groups/${groupId}`, () => getInvoiceSplitConfig(groupId));
}

export async function saveInvoiceSplitConfig(config: InvoiceSplitConfig): Promise<InvoiceSplitConfig> {
  return apiPost(`/api/groups/${config.groupId}`, config, () => createInvoiceSplitConfig(config));
}

// ────────────────────────────────────────────────────────────
// REGISTRATION
// ────────────────────────────────────────────────────────────

export async function submitRegistrasi(): Promise<{ success: boolean; kodeRegistrasi: string }> {
  // Registration is complex — keep mock for now, full API in Phase 5b
  return { success: true, kodeRegistrasi: `GRP-2026-${String(Math.floor(Math.random() * 90000) + 10000)}` };
}

// ────────────────────────────────────────────────────────────
// OPERATIONAL INTELLIGENCE (computed — keep mock)
// ────────────────────────────────────────────────────────────

export async function getJamaahReadiness(jamaahId: string): Promise<JamaahReadinessResult | undefined> {
  return apiGet(`/api/jamaah/${jamaahId}/readiness`, () => {
    const jamaah = mockJamaah.find((j) => j.id === jamaahId);
    if (!jamaah) return undefined;
    const group = mockGroups.find((g) => g.id === jamaah.groupId);
    const keberangkatan = group ? mockKeberangkatan.find((k) => k.id === group.paketKeberangkatanId) ?? null : null;
    const paymentSummary = mockPaymentSummaries.find((p) => p.groupId === jamaah.groupId) ?? null;
    const kbrRoomings = mockRoomings.filter((r) => r.keberangkatanId === keberangkatan?.id);
    const kbrManifests = mockManifests.filter((m) => m.keberangkatanId === keberangkatan?.id);
    return validateJamaahReadiness(jamaah, keberangkatan, paymentSummary, kbrRoomings, kbrManifests);
  });
}

export async function getJamaahProgress(jamaahId: string): Promise<JamaahProgress | undefined> {
  const jamaah = mockJamaah.find((j) => j.id === jamaahId);
  if (!jamaah) return undefined;
  return computeJamaahProgress(jamaah);
}

export async function generateManifest(config: ManifestGeneratorConfig): Promise<Manifest> {
  return apiPost("/api/manifests", config, () => {
    const keberangkatan = mockKeberangkatan.find((k) => k.id === config.keberangkatanId);
    if (!keberangkatan) throw new Error("Keberangkatan not found");
    const jamaahList = mockJamaah.filter((j) => {
      const g = mockGroups.find((grp) => grp.id === j.groupId);
      return g?.paketKeberangkatanId === config.keberangkatanId;
    });
    let filteredJamaah = jamaahList;
    let prefix = "";
    if (config.type === "siskopatuh" && config.hotelMekkah && config.hotelMadinah) {
      filteredJamaah = jamaahList.filter(
        (j) => j.hotelMekkah === config.hotelMekkah && j.hotelMadinah === config.hotelMadinah
      );
      prefix = `SKP-`;
    }
    const kbrRoomings = mockRoomings.filter((r) => r.keberangkatanId === config.keberangkatanId);
    const rows = generateManifestRows(filteredJamaah, config.type, kbrRoomings);
    const seq = mockManifests.filter((m) => m.keberangkatanId === config.keberangkatanId).length + 1;
    const manifest: Manifest = {
      id: `man-${Date.now()}`,
      keberangkatanId: config.keberangkatanId,
      kode: `MAN/${keberangkatan.kode}/${prefix}${String(seq).padStart(3, "0")}`,
      namaManifest: config.namaManifest,
      hotelMekkah: config.hotelMekkah,
      hotelMadinah: config.hotelMadinah,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      data: rows,
    };
    mockManifests.push(manifest);
    return manifest;
  });
}

export async function getExportData(request: ExportRequest): Promise<{ headers: string[]; rows: string[][] }> {
  return apiPost("/api/export", request, () => {
    const headers: Record<string, string[]> = {
      manifest: ["No", "Nama", "Paspor", "Tempat Lahir", "Tanggal Lahir", "Kursi", "Kamar", "Catatan"],
      rooming: ["Kamar", "Tipe", "Lantai", "Penghuni", "Gender", "Hotel M", "Hotel Md", "Status"],
      invoice: ["No. Invoice", "Group", "Tipe", "Jumlah", "Sisa", "Status", "Jatuh Tempo"],
      payment: ["Tanggal", "Group", "Invoice", "Jumlah", "Metode", "Status", "Catatan"],
      jamaah: ["No. Peserta", "Nama", "Gender", "TTL", "NIK", "Paspor", "Hotel", "Status", "Group"],
    };
    const rows: string[][] = [];
    return { headers: headers[request.type] ?? [], rows };
  });
}

export async function getAutoWarnings(keberangkatanId?: string): Promise<OperationalAlert[]> {
  const kbrList = keberangkatanId
    ? mockKeberangkatan.filter((k) => k.id === keberangkatanId)
    : mockKeberangkatan;
  const allAlerts: OperationalAlert[] = [];
  kbrList.forEach((kbr) => {
    const groups = mockGroups.filter((g) => g.paketKeberangkatanId === kbr.id);
    const groupIds = new Set(groups.map((g) => g.id));
    const jamaahList = mockJamaah.filter((j) => groupIds.has(j.groupId));
    const invoices = mockInvoices.filter((inv) => groupIds.has(inv.groupId));
    allAlerts.push(...generatePackageWarnings(kbr, jamaahList, invoices));
  });
  return [...mockAlerts, ...allAlerts];
}

export async function getPackageIntelligence(keberangkatanId: string): Promise<PackageIntelligence | undefined> {
  return apiGet(`/api/keberangkatan/${keberangkatanId}/intelligence`, () => {
    const kbr = mockKeberangkatan.find((k) => k.id === keberangkatanId);
    if (!kbr) return undefined;
    const groups = mockGroups.filter((g) => g.paketKeberangkatanId === keberangkatanId);
    const groupIds = new Set(groups.map((g) => g.id));
    const jamaahList = mockJamaah.filter((j) => groupIds.has(j.groupId));
    const invoices = mockInvoices.filter((inv) => groupIds.has(inv.groupId));
    const unpaidCount = invoices.filter((inv) => inv.status === "unpaid" || inv.status === "overdue").length;
    let dokumenPending = 0;
    jamaahList.forEach((j) => {
      const { allMandatoryComplete } = computeDocumentCompleteness(j.dokumen);
      if (!allMandatoryComplete) dokumenPending++;
    });
    const warnings = generatePackageWarnings(kbr, jamaahList, invoices);
    const readinessBreakdown: Record<string, number> = { READY: 0, WARNING: 0, INCOMPLETE: 0, BLOCKED: 0 };
    const kbrRoomings = mockRoomings.filter((r) => r.keberangkatanId === keberangkatanId);
    const kbrManifests = mockManifests.filter((m) => m.keberangkatanId === keberangkatanId);
    jamaahList.forEach((j) => {
      const ps = mockPaymentSummaries.find((p) => p.groupId === j.groupId) ?? null;
      const result = validateJamaahReadiness(j, kbr, ps, kbrRoomings, kbrManifests);
      readinessBreakdown[result.level] = (readinessBreakdown[result.level] ?? 0) + 1;
    });
    return { totalJamaah: kbr.terisi, unpaidCount, dokumenPending, roomingIncomplete: 0, manifestIncomplete: mockManifests.filter((m) => m.keberangkatanId === keberangkatanId && m.status !== "final").length, warningCount: warnings.length, readinessBreakdown };
  });
}

export async function getDerivedStatus(jamaahId: string): Promise<StatusJamaah | undefined> {
  const jamaah = mockJamaah.find((j) => j.id === jamaahId);
  if (!jamaah) return undefined;
  const group = mockGroups.find((g) => g.id === jamaah.groupId);
  const paymentSummary = group ? mockPaymentSummaries.find((p) => p.groupId === group.id) ?? null : null;
  const keberangkatan = group ? mockKeberangkatan.find((k) => k.id === group.paketKeberangkatanId) : undefined;
  const hasManifest = mockManifests.some((m) => m.keberangkatanId === keberangkatan?.id && m.data.some((r) => r.jamaahId === jamaahId));
  const hasRooming = mockRoomings.some((r) => r.keberangkatanId === keberangkatan?.id && r.kamar.some((k) => k.penghuni.some((p) => p.jamaahId === jamaahId)));
  return deriveAutoStatus(jamaah, paymentSummary, hasManifest, hasRooming);
}

export async function getOperationalTimeline(keberangkatanId: string): Promise<OperationalMilestone[] | undefined> {
  const kbr = mockKeberangkatan.find((k) => k.id === keberangkatanId);
  if (!kbr) return undefined;
  return computeOperationalTimeline(kbr);
}

// ────────────────────────────────────────────────────────────
// RBAC, AUDIT, ACTIVITY
// ────────────────────────────────────────────────────────────

const mockAuditLog: AuditEntry[] = [
  createAuditEntry({ module: "dokumen", action: "approve", detail: "Menyetujui paspor jamaah JMA-001", entityId: "dok-001", entityType: "paspor" }),
  createAuditEntry({ module: "pembayaran", action: "verify", detail: "Verifikasi pembayaran Rp 15.000.000 untuk grp-001", entityId: "pay-001", entityType: "pembayaran" }),
  createAuditEntry({ module: "manifest", action: "generate", detail: "Generate manifest SISKOPATUH Safwa-Taiba", entityId: "man-001", entityType: "manifest" }),
  createAuditEntry({ module: "rooming", action: "generate", detail: "Generate rooming Safwa-Taiba: 5 kamar", entityId: "room-001", entityType: "rooming" }),
  createAuditEntry({ module: "dokumen", action: "revisi", detail: "Minta revisi pas foto — background tidak sesuai", entityId: "dok-003", entityType: "pas_foto" }),
  createAuditEntry({ module: "pembayaran", action: "split", detail: "Split invoice grp-003 menjadi 2 bagian", entityId: "inv-003", entityType: "invoice" }),
  createAuditEntry({ module: "jamaah", action: "update", detail: "Update data jamaah — ganti nomor telepon", entityId: "jma-003", entityType: "jamaah" }),
  createAuditEntry({ module: "keberangkatan", action: "finalize", detail: "Finalisasi paket UMRH-JUN-2026", entityId: "kbr-001", entityType: "keberangkatan" }),
  createAuditEntry({ module: "manifest", action: "finalize", detail: "Finalkan manifest MAN/UMRH-JUN-2026/001", entityId: "man-001", entityType: "manifest" }),
  createAuditEntry({ module: "sistem", action: "login", detail: "Login ke sistem", entityId: "user-001", entityType: "user" }),
];

const mockActivityFeed: ActivityEvent[] = [
  { id: "act-001", timestamp: new Date(Date.now() - 3600000).toISOString(), keberangkatanId: "kbr-001", type: "success", message: "Rooming Safwa-Taiba selesai digenerate", module: "rooming" },
  { id: "act-002", timestamp: new Date(Date.now() - 7200000).toISOString(), keberangkatanId: "kbr-001", type: "warning", message: "2 jamaah belum upload pas foto", module: "dokumen" },
  { id: "act-003", timestamp: new Date(Date.now() - 10800000).toISOString(), keberangkatanId: "kbr-001", type: "info", message: "Manifest SISKOPATUH Anjum-Taiba dibuat", module: "manifest" },
  { id: "act-004", timestamp: new Date(Date.now() - 14400000).toISOString(), keberangkatanId: "kbr-002", type: "error", message: "Pembayaran grp-004 overdue 3 hari", module: "pembayaran" },
  { id: "act-005", timestamp: new Date(Date.now() - 18000000).toISOString(), keberangkatanId: "kbr-001", type: "success", message: "Dokumen jamaah JMA-007 verified lengkap", module: "dokumen" },
  { id: "act-006", timestamp: new Date(Date.now() - 21600000).toISOString(), keberangkatanId: "kbr-003", type: "info", message: "Paket UMRH-AGT-2026 dibuka untuk pendaftaran", module: "keberangkatan" },
  { id: "act-007", timestamp: new Date(Date.now() - 25200000).toISOString(), keberangkatanId: "kbr-001", type: "warning", message: "Deadline pelunasan 14 hari lagi — 3 group belum lunas", module: "pembayaran" },
  { id: "act-008", timestamp: new Date(Date.now() - 28800000).toISOString(), keberangkatanId: "kbr-002", type: "info", message: "Tour leader di-assign ke paket UMRH-JUL-2026", module: "keberangkatan" },
];

export async function getUserRole(): Promise<OperationalRole> {
  return "super_admin";
}

export async function checkPermission(module: string): Promise<PermissionCheck> {
  const role = await getUserRole();
  return canAccessModule(role, module);
}

export async function getAuditLog(module?: string, limit = 50): Promise<AuditEntry[]> {
  return apiGet(`/api/audit${module ? `?module=${module}` : ""}`, () => {
    let filtered = mockAuditLog;
    if (module && module !== "all") filtered = mockAuditLog.filter((a) => a.module === module);
    return filtered.slice(0, limit);
  });
}

export async function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
  return apiPost("/api/audit", entry, () => {
    const newEntry = createAuditEntry(entry);
    mockAuditLog.unshift(newEntry);
    return newEntry;
  });
}

export async function getActivityFeed(keberangkatanId?: string): Promise<ActivityEvent[]> {
  if (keberangkatanId) return mockActivityFeed.filter((a) => a.keberangkatanId === keberangkatanId);
  return mockActivityFeed;
}

export async function getAutoDeadlines(keberangkatanId: string): Promise<AutoDeadline[] | undefined> {
  const kbr = mockKeberangkatan.find((k) => k.id === keberangkatanId);
  if (!kbr) return undefined;
  return computeAutoDeadlines(kbr);
}

export async function getFinalizationResult(keberangkatanId: string): Promise<FinalizationResult | undefined> {
  return apiGet(`/api/keberangkatan/${keberangkatanId}/finalization`, () => {
    const kbr = mockKeberangkatan.find((k) => k.id === keberangkatanId);
    if (!kbr) return undefined;
    const groups = mockGroups.filter((g) => g.paketKeberangkatanId === keberangkatanId);
    const groupIds = new Set(groups.map((g) => g.id));
    const jamaahList = mockJamaah.filter((j) => groupIds.has(j.groupId));
    const paymentSummaries = mockPaymentSummaries.filter((p) => groupIds.has(p.groupId));
    const kbrRoomings = mockRoomings.filter((r) => r.keberangkatanId === keberangkatanId);
    const kbrManifests = mockManifests.filter((m) => m.keberangkatanId === keberangkatanId);
    return validateFinalization(kbr, jamaahList, paymentSummaries, kbrRoomings, kbrManifests);
  });
}

export async function getPackageReadinessScore(keberangkatanId: string): Promise<PackageReadinessScore | undefined> {
  return apiGet(`/api/keberangkatan/${keberangkatanId}/readiness-score`, () => {
    const kbr = mockKeberangkatan.find((k) => k.id === keberangkatanId);
    if (!kbr) return undefined;
    const intel = mockKeberangkatan.find((k) => k.id === keberangkatanId) ? { totalJamaah: kbr.terisi, unpaidCount: 0, dokumenPending: 0, roomingIncomplete: 0, manifestIncomplete: 0, warningCount: 0, readinessBreakdown: {} } : null;
    if (!intel) return undefined;
    const deadlines = computeAutoDeadlines(kbr);
    return computePackageReadinessScore(kbr, intel, deadlines);
  });
}

export async function globalSearchQuery(query: string): Promise<GlobalSearchResult[]> {
  return apiGet(`/api/search?q=${encodeURIComponent(query)}`, () => {
    const scope = { jamaah: mockJamaah, groups: mockGroups, invoices: mockInvoices, keberangkatan: mockKeberangkatan };
    return globalSearch(query, scope);
  });
}

// ────────────────────────────────────────────────────────────
// DOCUMENT UPLOAD & OCR (simulated — real in Phase 8)
// ────────────────────────────────────────────────────────────

export async function simulateUpload(file: { name: string; size: number; type: string }): Promise<UploadResult> {
  await new Promise((r) => setTimeout(r, 1500));
  if (Math.random() < 0.1) throw new Error("Upload failed");
  const confidence = 0.6 + Math.random() * 0.35;
  return { fileName: file.name, fileSize: file.size, fileType: file.type, uploadedAt: new Date().toISOString(), ocrConfidence: Math.round(confidence * 100) / 100 };
}

export async function simulateOcrProcessing(_dokumenId: string): Promise<{ confidence: number }> {
  await new Promise((r) => setTimeout(r, 2000));
  const confidence = 0.55 + Math.random() * 0.4;
  return { confidence: Math.round(confidence * 100) / 100 };
}

// ────────────────────────────────────────────────────────────
// PAYMENT WORKFLOW
// ────────────────────────────────────────────────────────────

export async function approvePayment(paymentId: string, reviewerId: string): Promise<Pembayaran | undefined> {
  return apiPost(`/api/pembayaran/${paymentId}/approve`, { reviewerId }, () => {
    const payment = mockPembayaran.find((p) => p.id === paymentId);
    if (!payment) return undefined;
    payment.status = "verified";
    payment.reviewedBy = reviewerId;
    payment.reviewedAt = new Date().toISOString();
    mockAuditLog.unshift(createAuditEntry({
      module: "pembayaran", action: "approve",
      detail: `Menyetujui pembayaran ${formatCurrency(payment.jumlah)} dari jamaah (${payment.id})`,
      entityId: paymentId, entityType: "pembayaran",
    }));
    return payment;
  });
}

export async function rejectPayment(paymentId: string, reviewerId: string, alasan: string): Promise<Pembayaran | undefined> {
  return apiPost(`/api/pembayaran/${paymentId}/reject`, { alasanReject: alasan }, () => {
    const payment = mockPembayaran.find((p) => p.id === paymentId);
    if (!payment) return undefined;
    payment.status = "rejected";
    payment.reviewedBy = reviewerId;
    payment.reviewedAt = new Date().toISOString();
    payment.alasanReject = alasan;
    mockAuditLog.unshift(createAuditEntry({
      module: "pembayaran", action: "reject",
      detail: `Menolak pembayaran ${formatCurrency(payment.jumlah)}. Alasan: ${alasan}`,
      entityId: paymentId, entityType: "pembayaran",
    }));
    return payment;
  });
}

export async function getPaymentReviewQueue(): Promise<Pembayaran[]> {
  return apiGet("/api/pembayaran/review", () => mockPembayaran.filter((p) => p.status === "pending"));
}

export async function cancelInvoiceItem(invoiceId: string, itemId: string, reason: string, cancelledBy: string): Promise<Invoice | undefined> {
  const invoice = mockInvoices.find((inv) => inv.id === invoiceId);
  if (!invoice) return undefined;
  const item = invoice.items.find((it) => it.id === itemId);
  if (!item) return undefined;
  item.status = "cancelled";
  item.cancelledAt = new Date().toISOString();
  item.cancelledBy = cancelledBy;
  item.cancellationReason = reason;
  return invoice;
}

export async function submitJamaahPayment(data: {
  groupId: string; invoiceId?: string; jumlah: number; bankPengirim: string; nomorRekening?: string; buktiUrl?: string; catatan?: string;
}): Promise<Pembayaran> {
  return apiPost("/api/pembayaran", {
    ...data,
    metode: "transfer",
    sumber: "jamaah",
    tanggal: new Date().toISOString(),
    status: "pending",
    alokasi: [],
  }, () => {
    const newPembayaran: Pembayaran = {
      id: `byr-j-${Date.now()}`, groupId: data.groupId, invoiceId: data.invoiceId,
      jumlah: data.jumlah, metode: "transfer", tanggal: new Date().toISOString(),
      status: "pending", sumber: "jamaah",
      bankPengirim: data.bankPengirim, nomorRekening: data.nomorRekening,
      buktiUrl: data.buktiUrl, catatan: data.catatan, alokasi: [],
    };
    mockPembayaran.push(newPembayaran);
    return newPembayaran;
  });
}

// ────────────────────────────────────────────────────────────
// DOCUMENT REVIEW & OCR
// ────────────────────────────────────────────────────────────

export interface DokumenReviewItem { dokumen: DokumenItem; jamaah: Jamaah; }

export async function getDokumenReviewQueue(filter?: string): Promise<DokumenReviewItem[]> {
  return apiGet(`/api/dokumen/review${filter ? `?filter=${filter}` : ""}`, () => {
    const results: DokumenReviewItem[] = [];
    for (const j of mockJamaah) {
      for (const d of j.dokumen) {
        let include = false;
        switch (filter) {
          case "ocr_failed": include = d.dataStatus === "ocr_error"; break;
          case "low_confidence": include = !!(d.ocrData && d.ocrData.confidence < 0.6); break;
          case "revisi": include = d.status === "revisi" || d.fileStatus === "revisi"; break;
          case "pending": include = d.status === "pending" || d.status === "processing"; break;
          default: include = d.status !== "verified" && d.status !== "lengkap";
        }
        if (include) results.push({ dokumen: d, jamaah: j });
      }
    }
    return results;
  });
}

export async function saveManualOcrData(
  dokumenId: string, manualData: { namaLengkap?: string; nik?: string; nomorPaspor?: string; tanggalLahir?: string }
): Promise<DokumenItem | undefined> {
  for (const j of mockJamaah) {
    const doc = j.dokumen.find((d) => d.id === dokumenId);
    if (doc) { doc.manualData = { ...doc.manualData, ...manualData }; doc.dataStatus = "manual_edit"; return doc; }
  }
  return undefined;
}

export async function checkImageQuality(_file: { name: string; size: number }): Promise<{ isBlurry: boolean; isReadable: boolean; checkedAt: string }> {
  await new Promise((r) => setTimeout(r, 800));
  const isBlurry = Math.random() < 0.3;
  return { isBlurry, isReadable: !isBlurry || Math.random() > 0.5, checkedAt: new Date().toISOString() };
}

export async function simulateZipDownload(packageId: string, docJenis?: string): Promise<{ success: boolean; fileName: string; fileCount: number; structure: string[] }> {
  await new Promise((r) => setTimeout(r, 1000));
  const groups = mockGroups.filter((g) => g.paketKeberangkatanId === packageId);
  if (groups.length === 0) return { success: false, fileName: "", fileCount: 0, structure: [] };
  const groupIds = new Set(groups.map((g) => g.id));
  const jamaahList = mockJamaah.filter((j) => groupIds.has(j.groupId));
  const kbr = mockKeberangkatan.find((k) => k.id === packageId);
  const structure: string[] = [];
  let fileCount = 0;
  const docTypeOrder: Record<string, number> = { paspor: 1, pas_foto: 2, vaksin: 3, ktp: 4, kk: 5, akta: 6 };
  const sortedJamaah = [...jamaahList].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id"));
  sortedJamaah.forEach((j) => {
    const docs = j.dokumen.filter((d) => !docJenis || d.jenis === docJenis).filter((d) => d.fileUrl || d.status === "verified" || d.status === "lengkap").sort((a, b) => (docTypeOrder[a.jenis] ?? 99) - (docTypeOrder[b.jenis] ?? 99));
    docs.forEach((d) => { structure.push(`${j.namaLengkap.replace(/\s+/g, "_")}/${d.jenis}_${j.nomorPeserta}.pdf`); fileCount++; });
  });
  const jenisLabel = docJenis ? `-${docJenis}` : "-semua";
  const kode = kbr?.kode ?? packageId;
  return { success: true, fileName: `dokumen${jenisLabel}-${kode}.zip`, fileCount, structure };
}

// ────────────────────────────────────────────────────────────
// DOCUMENT COMPLETION MATRIX
// ────────────────────────────────────────────────────────────

export interface DocumentCompletionRow {
  jamaahId: string; namaLengkap: string; groupId: string; kodeRegistrasi: string;
  dokumen: Record<string, { status: string; dataStatus?: string; fileStatus?: string; uploadedAt?: string }>;
  completionPercentage: number; allMandatoryComplete: boolean;
}

export async function getDocumentCompletionMatrix(packageId: string): Promise<DocumentCompletionRow[]> {
  const groups = mockGroups.filter((g) => g.paketKeberangkatanId === packageId);
  const groupIds = new Set(groups.map((g) => g.id));
  const jamaahList = mockJamaah.filter((j) => groupIds.has(j.groupId));
  const allJenis: DokumenJenis[] = ["paspor", "pas_foto", "vaksin", "ktp", "kk", "akta"];
  return jamaahList.map((j) => {
    const docMap: Record<string, { status: string; dataStatus?: string; fileStatus?: string; uploadedAt?: string }> = {};
    allJenis.forEach((jenis) => {
      const doc = j.dokumen.find((d) => d.jenis === jenis);
      docMap[jenis] = doc ? { status: doc.status, dataStatus: doc.dataStatus, fileStatus: doc.fileStatus, uploadedAt: doc.uploadedAt } : { status: "pending", dataStatus: "pending" };
    });
    const { percentage, allMandatoryComplete } = computeDocumentCompleteness(j.dokumen);
    const group = groups.find((g) => g.id === j.groupId);
    return { jamaahId: j.id, namaLengkap: j.namaLengkap, groupId: j.groupId, kodeRegistrasi: group?.kodeRegistrasi ?? "-", dokumen: docMap, completionPercentage: percentage, allMandatoryComplete };
  });
}
