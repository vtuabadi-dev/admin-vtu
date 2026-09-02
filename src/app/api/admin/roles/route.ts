import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import type { OperationalRole } from "@/shared/types";

export const dynamic = "force-dynamic";

export interface ModulePermission {
  moduleKey: string;
  moduleLabel: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canExport: boolean;
  canDelete: boolean;
}

export interface RoleConfigItem {
  role: OperationalRole;
  label: string;
  description: string;
  badgeClass: string;
  enterpriseLevel: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
  permissions: ModulePermission[];
}

const ROLE_CONFIG_DATA: RoleConfigItem[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Akses penuh tanpa batas ke seluruh modul operasional, audit log, konfigurasi sistem, dan manajemen user.",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-200",
    enterpriseLevel: "SUPER_ADMIN",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: true },
    ],
  },
  {
    role: "admin_operasional",
    label: "Admin Operasional",
    description: "Mengelola seluruh operasional harian umroh (paket, jamaah, pembayaran, manifest) tanpa akses ke maintenance sistem & audit log.",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-200",
    enterpriseLevel: "OWNER",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
  {
    role: "admin_pembayaran",
    label: "Admin Pembayaran / Keuangan",
    description: "Fokus pada pengelolaan transaksi keuangan, verifikasi slip transfer, penerbitan invoice, dan laporan kas.",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    enterpriseLevel: "ADMIN",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
  {
    role: "admin_manifest",
    label: "Admin Manifest",
    description: "Bertanggung jawab atas data paspor, penomoran manifest penerbangan, kombinasi hotel, dan pembagian kamar (rooming).",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-200",
    enterpriseLevel: "ADMIN",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: false, canEdit: true, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: true, canEdit: true, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
  {
    role: "admin_dokumen",
    label: "Admin Dokumen",
    description: "Menangani verifikasi dokumen jamaah (paspor, KTP, KK, foto), peninjauan hasil scan AI OCR, dan revisi berkas.",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    enterpriseLevel: "STAFF",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
  {
    role: "admin_badal",
    label: "Admin Badal Umroh & Wakaf",
    description: "Khusus menangani pendaftaran, sertifikasi, pelaporan video, dan verifikasi pembayaran Badal Umroh & Wakaf Al-Qur'an.",
    badgeClass: "bg-teal-500/10 text-teal-600 border-teal-200",
    enterpriseLevel: "STAFF",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: true, canEdit: true, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: true, canCreate: true, canEdit: true, canApprove: true, canExport: true, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
  {
    role: "tour_leader",
    label: "Tour Leader",
    description: "Akses membaca data jamaah, daftar bus/kamar, dan manifest saat memandu jamaah di tanah suci.",
    badgeClass: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    enterpriseLevel: "VIEWER",
    permissions: [
      { moduleKey: "paket", moduleLabel: "Paket Umroh & Keberangkatan", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "jamaah", moduleLabel: "Data Jamaah & Registrasi", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "dokumen", moduleLabel: "Dokumen Paspor & AI OCR", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "pembayaran", moduleLabel: "Pembayaran & Invoice Group", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "manifest", moduleLabel: "Manifest Flight & Rooming", canView: true, canCreate: false, canEdit: false, canApprove: false, canExport: true, canDelete: false },
      { moduleKey: "badal", moduleLabel: "Program Badal Umroh & Wakaf", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "audit", moduleLabel: "Audit Log & System Maintenance", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
      { moduleKey: "users", moduleLabel: "Manajemen User & Hak Akses", canView: false, canCreate: false, canEdit: false, canApprove: false, canExport: false, canDelete: false },
    ],
  },
];

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: ROLE_CONFIG_DATA });
}
