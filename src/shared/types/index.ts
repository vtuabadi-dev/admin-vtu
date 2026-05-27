// ============================================================
// CORE DOMAIN TYPES — Travel Operational Automation System
// Group-centric model: Registration Group = administrative center
// ============================================================

// --- Base Enums & Literals ---

/** Mandatory: Paspor, Pas Foto, Vaksin, KTP. Optional: KK, Akta */
export type DokumenJenis = "paspor" | "pas_foto" | "vaksin" | "ktp" | "kk" | "akta";

export const DOKUMEN_WAJIB: DokumenJenis[] = ["paspor", "pas_foto", "vaksin", "ktp"];
export const DOKUMEN_OPSIONAL: DokumenJenis[] = ["kk", "akta"];

export type ValidationPriority = "strict" | "flexible";

export const VALIDATION_LEVEL: Record<DokumenJenis, ValidationPriority> = {
  paspor: "strict",
  pas_foto: "strict",
  vaksin: "flexible",
  ktp: "flexible",
  kk: "flexible",
  akta: "flexible",
};

export type StatusDokumen = "lengkap" | "kurang" | "revisi" | "pending" | "processing" | "verified" | "rejected";

export type StatusPembayaran = "draft" | "dp" | "cicilan" | "hampir_lunas" | "lunas" | "overdue";

export type StatusJamaah =
  | "registered"
  | "dokumen_upload"
  | "dokumen_verified"
  | "pembayaran_pending"
  | "lunas"
  | "ready"
  | "berangkat"
  | "batal";

export type JenisKelamin = "L" | "P";

export type StatusKeberangkatan = "scheduled" | "preparing" | "ready" | "departed" | "completed" | "cancelled";

export type TipeKamar = "single" | "double" | "triple" | "quad";

export type TipeInvoice = "dp" | "cicilan" | "pelunasan" | "tambahan";

export type StatusInvoice = "unpaid" | "partial" | "paid" | "overdue" | "cancelled";

export type MetodePembayaran = "transfer" | "cash" | "virtual_account" | "qris";

export type Role = "admin" | "agent" | "jamaah";

export type StatusItemInvoice = "active" | "cancelled" | "completed";

export type SumberPembayaran = "admin" | "jamaah";

// ============================================================
// REGISTRATION GROUP — The administrative center
// ============================================================

/**
 * Registration Group is the core unit of administration.
 * Format: GRP-YYYY-NNNNN (e.g., GRP-2026-00081)
 * Child jamaah: GRP-YYYY-NNNNN-N (e.g., GRP-2026-00081-1)
 */
/** TODO: Multi-tenant — add tenantId: string */
export interface RegistrationGroup {
  id: string;
  /** Kode registrasi format: GRP-YYYY-NNNNN */
  kodeRegistrasi: string;
  namaGroup: string;
  ketuaGroupId: string;
  paketKeberangkatanId: string;
  jumlahAnggota: number;
  totalTagihan: number;
  totalPembayaran: number;
  sisaPembayaran: number;
  status: "active" | "completed" | "cancelled";
  /** Anggota jamaah dalam grup ini */
  anggotaIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// JAMAAH — Individual under a Registration Group
// ============================================================

/** TODO: Multi-tenant — add tenantId: string */
export interface Jamaah {
  id: string;
  /** Child registration ID: GRP-YYYY-NNNNN-N */
  registrationId: string;
  groupId: string;
  nomorPeserta: string;
  namaLengkap: string;
  namaAyah: string;
  jenisKelamin: JenisKelamin;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  nomorPaspor: string;
  masaBerlakuPaspor: string;
  nomorTelepon: string;
  email: string;
  alamat: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  /** Digital signature acceptance */
  tandaTanganDigital?: string;
  syaratDisetujui: boolean;
  status: StatusJamaah;
  /** Hotel assignment — determines manifest grouping */
  hotelMekkah: string;
  hotelMadinah: string;
  dokumen: DokumenItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// REGISTRATION FORM
// ============================================================

export interface RegistrasiFormData {
  namaLengkap: string;
  namaAyah: string;
  jenisKelamin: JenisKelamin;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  nomorPaspor: string;
  masaBerlakuPaspor: string;
  nomorTelepon: string;
  email: string;
  alamat: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  paketKeberangkatanId: string;
  namaGroup: string;
  /** Base64 encoded signature image */
  tandaTanganDigital: string;
  syaratDisetujui: boolean;
}

// ============================================================
// DOCUMENTS
// ============================================================

export interface DokumenItem {
  id: string;
  jamaahId: string;
  jenis: DokumenJenis;
  wajib: boolean;
  /** Document file status — the combined file+review state */
  status: StatusDokumen;
  fileUrl?: string;
  ocrData?: OcrData;
  catatan?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  /** Data layer status — whether OCR-extracted data is usable */
  dataStatus?: "valid" | "pending" | "manual_edit" | "ocr_error";
  /** File layer status — whether the uploaded file/image is acceptable */
  fileStatus?: "valid" | "blurry" | "revisi" | "rejected";
  /** Admin manual data edits (persisted separately from OCR results) */
  manualData?: {
    namaLengkap?: string;
    nik?: string;
    nomorPaspor?: string;
    tanggalLahir?: string;
  };
  /** Number of times this document has been re-uploaded / re-OCRed */
  ocrRetryCount?: number;
  /** Image quality assessment for re-upload optimization */
  qualityCheck?: {
    isBlurry?: boolean;
    isReadable?: boolean;
    checkedAt?: string;
  };
}

export interface OcrData {
  namaLengkap?: string;
  nik?: string;
  nomorPaspor?: string;
  tanggalLahir?: string;
  tempatLahir?: string;
  masaBerlaku?: string;
  confidence: number;
  rawText?: string;
}

export interface UploadResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  ocrConfidence: number;
}

// ============================================================
// GROUP-CENTRIC PAYMENT SYSTEM
// ============================================================

/**
 * Payment is ALWAYS recorded against a Registration Group.
 * Allocation determines how the payment is distributed across members.
 */
/** TODO: Multi-tenant — add tenantId: string */
export interface Pembayaran {
  id: string;
  groupId: string;
  invoiceId?: string;
  jumlah: number;
  metode: MetodePembayaran;
  tanggal: string;
  buktiUrl?: string;
  status: "pending" | "verified" | "rejected";
  /** Payment source: admin direct input or jamaah submission */
  sumber: SumberPembayaran;
  verifiedBy?: string;
  /** Rejection reason (required when rejected) */
  alasanReject?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Jamaah submission fields */
  bankPengirim?: string;
  nomorRekening?: string;
  catatan?: string;
  /** OCR parsing result (future-ready) */
  ocrData?: {
    nominal?: number;
    bank?: string;
    tanggal?: string;
    confidence?: number;
  };
  /** How this payment is allocated across group members */
  alokasi: AlokasiPembayaran[];
}

export interface AlokasiPembayaran {
  jamaahId: string;
  namaJamaah: string;
  jumlah: number;
}

/** TODO: Multi-tenant — add tenantId: string */
export interface Invoice {
  id: string;
  nomorInvoice: string;
  groupId: string;
  /** If set, this invoice is for a specific member. If null, it's a group invoice. */
  jamaahId?: string;
  tipe: TipeInvoice;
  jumlah: number;
  sisaTagihan: number;
  status: StatusInvoice;
  jatuhTempo: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  /** Item category: "Paket Umroh", "Perlengkapan", "Handling", "Administrasi", etc. */
  kategori: string;
  deskripsi: string;
  qty: number;
  hargaSatuan: number;
  /** Auto-calculated = qty * hargaSatuan (system-computed, never manual) */
  jumlah: number;
  status: StatusItemInvoice;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

// ============================================================
// GROUP PAYMENT SUMMARY (for UI display)
// ============================================================

export interface GroupPaymentSummary {
  groupId: string;
  kodeRegistrasi: string;
  namaGroup: string;
  totalTagihan: number;
  totalPembayaran: number;
  sisaPembayaran: number;
  status: StatusPembayaran;
  jumlahAnggota: number;
  anggota: Jamaah[];
  pembayaran: Pembayaran[];
  invoices: Invoice[];
}

// ============================================================
// KEBERANGKATAN & MANIFEST (unchanged core)
// ============================================================

/** TODO: Multi-tenant — add tenantId: string */
export interface Keberangkatan {
  id: string;
  kode: string;
  namaPaket: string;
  hargaPaket: number;
  tanggalBerangkat: string;
  tanggalPulang: string;
  maskapai: string;
  nomorPenerbangan: string;
  /** Default hotel (legacy) */
  hotelMekkah: string;
  hotelMadinah: string;
  /** Available hotel combinations — jamaah pick one pair */
  hotelOptions: { hotelMekkah: string; hotelMadinah: string }[];
  status: StatusKeberangkatan;
  kuota: number;
  terisi: number;
  jamaahIds: string[];
}

/** TODO: Multi-tenant — add tenantId: string */
export interface Manifest {
  id: string;
  keberangkatanId: string;
  kode: string;
  namaManifest: string;
  templateId?: string;
  /** SISKOPATUH hotel grouping — set when manifest is split by hotel combination */
  hotelMekkah?: string;
  hotelMadinah?: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "final" | "submitted";
  data: ManifestRow[];
}

export interface ManifestRow {
  id: string;
  nomorUrut: number;
  jamaahId: string;
  nomorPaspor: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  nomorKursi?: string;
  nomorKamar?: string;
  catatan?: string;
}

/** TODO: Multi-tenant — add tenantId: string */
export interface Rooming {
  id: string;
  keberangkatanId: string;
  hotelMekkah: string;
  hotelMadinah: string;
  hotelNama: string;
  createdAt: string;
  status: "draft" | "final";
  kamar: Kamar[];
}

export interface Kamar {
  id: string;
  roomingId: string;
  nomorKamar: string;
  tipe: TipeKamar;
  lantai: number;
  penghuni: PenghuniKamar[];
  /** Quad Mix label, e.g. "Quad Mix Male 1" */
  mixLabel?: string;
}

export interface PenghuniKamar {
  jamaahId: string;
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  isPasangan?: boolean;
}

// ============================================================
// HOTEL COMBINATION — SISKOPATUH manifest grouping
// ============================================================

export interface HotelCombinationSummary {
  hotelMekkah: string;
  hotelMadinah: string;
  label: string;
  jumlahJamaah: number;
  jamaahIds: string[];
}

// ============================================================
// SPLIT INVOICE — permanent group split structure
// ============================================================

export interface InvoiceSplitItem {
  id: string;
  label: string;
  anggotaIds: string[];
}

export interface InvoiceSplitConfig {
  groupId: string;
  createdAt: string;
  splits: InvoiceSplitItem[];
}

// ============================================================
// REMINDER (group-aware)
// ============================================================

export interface Reminder {
  id: string;
  groupId: string;
  jamaahId?: string;
  invoiceId?: string;
  tipe: "dokumen" | "pembayaran";
  pesan: string;
  dikirimPada: string;
  status: "sent" | "read" | "responded";
}

/** Template variables for reminder messages */
export interface ReminderTemplate {
  namaJamaah: string;
  namaGroup: string;
  nominalSisa: string;
  paketKeberangkatan: string;
  nomorInvoice?: string;
  jatuhTempo?: string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardStats {
  totalJamaah: number;
  totalGroup: number;
  totalBerangkat: number;
  dokumenLengkap: number;
  dokumenKurang: number;
  pembayaranLunas: number;
  pembayaranPending: number;
  pembayaranOverdue: number;
  keberangkatanMendatang: number;
}

export interface OperationalAlert {
  id: string;
  tipe: "warning" | "danger" | "info";
  pesan: string;
  jumlahTerdampak: number;
  module: string;
  link: string;
  createdAt: string;
}

// ============================================================
// API GENERICS
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================
// SYSTEM 1: MASTER DATA VALIDATION / READINESS
// ============================================================

export type ReadinessLevel = "READY" | "WARNING" | "INCOMPLETE" | "BLOCKED";

export interface ReadinessCheckItem {
  key: string;
  label: string;
  status: "passed" | "warning" | "failed" | "skipped";
  detail?: string;
}

export interface JamaahReadinessResult {
  level: ReadinessLevel;
  checks: ReadinessCheckItem[];
  passed: number;
  total: number;
  score: number;
}

// ============================================================
// SYSTEM 3: JAMAAH PROGRESS TRACKING
// ============================================================

export interface ProgressStep {
  key: string;
  label: string;
  status: "completed" | "current" | "pending";
  order: number;
}

export interface JamaahProgress {
  steps: ProgressStep[];
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
}

// ============================================================
// SYSTEM 4: MANIFEST GENERATOR ENGINE
// ============================================================

export type ManifestType = "visa" | "blockseat" | "siskopatuh" | "hotel" | "rooming";

export interface ManifestGeneratorConfig {
  type: ManifestType;
  keberangkatanId: string;
  namaManifest: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
}

// ============================================================
// SYSTEM 5: EXPORT CENTER
// ============================================================

export type ExportDataType = "manifest" | "rooming" | "invoice" | "payment" | "jamaah";
export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportRequest {
  type: ExportDataType;
  format: ExportFormat;
  filterKeberangkatanId?: string;
  filterGroupId?: string;
  filterHotelKey?: string;
}

// ============================================================
// SYSTEM 7: PACKAGE DETAIL INTELLIGENCE
// ============================================================

export interface PackageIntelligence {
  totalJamaah: number;
  unpaidCount: number;
  dokumenPending: number;
  roomingIncomplete: number;
  manifestIncomplete: number;
  warningCount: number;
  readinessBreakdown: Record<string, number>;
}

// ============================================================
// SYSTEM 9: OPERATIONAL TIMELINE
// ============================================================

export type MilestoneType = "deadline" | "reminder" | "event";

export interface OperationalMilestone {
  key: string;
  label: string;
  tanggal: string;
  type: MilestoneType;
  passed: boolean;
  urgent: boolean;
  description?: string;
}

// ============================================================
// SYSTEM 10: ADMIN QUICK ACTIONS
// ============================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href?: string;
  action?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "destructive" | "secondary";
}

// ============================================================
// SYSTEM: RBAC & ROLE-BASED ACCESS
// ============================================================

export type OperationalRole =
  | "super_admin"
  | "admin_operasional"
  | "admin_pembayaran"
  | "admin_manifest"
  | "admin_dokumen"
  | "tour_leader"
  | "jamaah";

export interface PermissionCheck {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canExport: boolean;
  canDelete: boolean;
}

export type PermissionAction = "view" | "create" | "edit" | "approve" | "export" | "delete";

export type PermissionModule =
  | "dokumen"
  | "pembayaran"
  | "manifest"
  | "rooming"
  | "keberangkatan"
  | "jamaah"
  | "sistem"
  | "audit"
  | "export"
  | "backup";

// ============================================================
// SYSTEM: AUDIT TRAIL
// ============================================================

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: OperationalRole;
  module: "dokumen" | "pembayaran" | "manifest" | "rooming" | "keberangkatan" | "jamaah" | "sistem";
  action: string;
  detail: string;
  before?: string;
  after?: string;
  entityId?: string;
  entityType?: string;
}

// ============================================================
// SYSTEM: ACTIVITY LOG
// ============================================================

export interface ActivityEvent {
  id: string;
  timestamp: string;
  keberangkatanId: string;
  type: "warning" | "info" | "success" | "error";
  message: string;
  module: string;
  triggeredBy?: string;
}

// ============================================================
// SYSTEM: AUTO DEADLINE ENGINE
// ============================================================

export interface AutoDeadline {
  id: string;
  keberangkatanId: string;
  label: string;
  deadlineDate: string;
  type: "pelunasan" | "dokumen" | "manifest" | "rooming" | "finalisasi";
  passed: boolean;
  warningDays: number;
}

// ============================================================
// SYSTEM: PACKAGE FINALIZATION
// ============================================================

export interface FinalizationCheck {
  key: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}

export interface FinalizationResult {
  canFinalize: boolean;
  checks: FinalizationCheck[];
  blockingCount: number;
  totalCount: number;
}

// ============================================================
// SYSTEM: PACKAGE READINESS SCORE
// ============================================================

export interface PackageReadinessScore {
  overallScore: number;
  paymentScore: number;
  documentScore: number;
  manifestScore: number;
  roomingScore: number;
  operationalScore: number;
  breakdown: { label: string; score: number; weight: number }[];
}

// ============================================================
// SYSTEM: SMART SEARCH
// ============================================================

export interface GlobalSearchResult {
  type: "jamaah" | "group" | "invoice" | "keberangkatan" | "hotel";
  id: string;
  title: string;
  subtitle: string;
  module: string;
  link: string;
}

// ============================================================
// TODO: Multi-tenant — tenant isolation boundary
// ============================================================

export interface TenantBoundary {
  tenantId: string;
  tenantName: string;
  // TODO: Multi-tenant — scope all queries by tenantId on: Jamaah, RegistrationGroup, Keberangkatan, Manifest, Rooming, Invoice, Pembayaran
  // TODO: Multi-tenant — add tenantId FK to core entities before SaaS launch
  // TODO: Multi-tenant — enforce RLS policies in Supabase per tenantId
}
