import { keberangkatanRepo } from "../repositories/keberangkatan.repository";
import type { 
  PackageIntelligence, 
  FinalizationResult, 
  PackageReadinessScore 
} from "@/shared/types";

export const packageService = {
  async findAll(params?: { status?: string; limit?: number; offset?: number }) {
    return keberangkatanRepo.findAll(params);
  },

  async findById(id: string) {
    return keberangkatanRepo.findById(id);
  },

  async create(data: any) {
    return keberangkatanRepo.create(data);
  },

  async update(id: string, data: any) {
    return keberangkatanRepo.update(id, data);
  },

  async delete(id: string) {
    return keberangkatanRepo.delete(id);
  },

  async getPackageIntelligence(keberangkatanId: string): Promise<PackageIntelligence | null> {
    const row = await keberangkatanRepo.getForIntelligence(keberangkatanId);
    if (!row) return null;

    const allJamaah = row.groups.flatMap((g: any) => g.anggota);
    const unpaidCount = row.groups.reduce((sum: number, g: any) => sum + (g.sisaPembayaran > 0 ? 1 : 0), 0);
    const dokumenPending = allJamaah.filter((j: any) => j.dokumen.some((d: any) => d.status !== "verified" && d.status !== "lengkap")).length;
    const roomingIncomplete = row.roomings.filter((r: any) => r.status !== "final").length;
    const manifestIncomplete = row.manifests.filter((m: any) => m.status !== "final" && m.status !== "submitted").length;
    const warningCount = [unpaidCount > 0 ? 1 : 0, dokumenPending > 0 ? 1 : 0, roomingIncomplete > 0 ? 1 : 0, manifestIncomplete > 0 ? 1 : 0].filter(Boolean).length;

    return {
      totalJamaah: allJamaah.length,
      unpaidCount,
      dokumenPending,
      roomingIncomplete,
      manifestIncomplete,
      warningCount,
      readinessBreakdown: row.groups.reduce((acc: Record<string, number>, g: any) => {
        acc[g.kodeRegistrasi] = g.sisaPembayaran <= 0 ? 1 : 0;
        return acc;
      }, {}),
    };
  },

  async getFinalizationResult(keberangkatanId: string): Promise<FinalizationResult> {
    const row = await keberangkatanRepo.getForFinalization(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const checks: any[] = [
      {
        key: "all_lunas",
        label: "Semua jamaah lunas",
        passed: row.groups.every((g: any) => g.sisaPembayaran <= 0),
        blocking: true,
        detail: row.groups.filter((g: any) => g.sisaPembayaran > 0).map((g: any) => `${g.kodeRegistrasi}: sisa ${g.sisaPembayaran}`).join("; ") || undefined,
      },
      {
        key: "dokumen_verified",
        label: "Dokumen semua jamaah terverifikasi",
        passed: row.groups.every((g: any) => g.anggota.every((a: any) => a.dokumen.filter((d: any) => d.wajib).every((d: any) => d.status === "verified" || d.status === "lengkap"))),
        blocking: true,
      },
      {
        key: "manifest_final",
        label: "Manifest sudah final",
        passed: row.manifests.length > 0 && row.manifests.every((m: any) => m.status === "final" || m.status === "submitted"),
        blocking: true,
      },
      {
        key: "rooming_final",
        label: "Rooming sudah final",
        passed: row.roomings.length > 0 && row.roomings.every((r: any) => r.status === "final"),
        blocking: false,
      },
      {
        key: "kuota_terpenuhi",
        label: "Kuota terpenuhi",
        passed: row.terisi >= row.kuota,
        blocking: false,
        detail: `${row.terisi}/${row.kuota} terisi`,
      },
    ];

    const blockingCount = checks.filter((c: any) => !c.passed && c.blocking).length;
    return {
      canFinalize: checks.every((c: any) => c.passed || !c.blocking),
      checks,
      blockingCount,
      totalCount: checks.length,
    };
  },

  async getManifestValidation(keberangkatanId: string): Promise<{
    canFinalize: boolean;
    blockers: { label: string; count: number; detail: string }[];
    warnings: { label: string; count: number; detail: string }[];
  }> {
    const { row, hasRooming } = await keberangkatanRepo.getForManifestValidation(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const blockers: { label: string; count: number; detail: string }[] = [];
    const warnings: { label: string; count: number; detail: string }[] = [];
    const allJamaah = row.groups.flatMap((g: any) => g.anggota);

    const unpaidJamaah = row.groups.filter((g: any) => g.sisaPembayaran > 0).flatMap((g: any) => g.anggota);
    if (unpaidJamaah.length > 0) {
      blockers.push({ label: "Unpaid Jamaah", count: unpaidJamaah.length, detail: `${unpaidJamaah.length} jamaah in groups with outstanding balance` });
    }

    const missingPassport = allJamaah.filter((j: any) => !j.dokumen.some((d: any) => d.jenis === "paspor" && (d.status === "verified" || d.status === "lengkap")));
    if (missingPassport.length > 0) {
      blockers.push({ label: "Missing Verified Passport", count: missingPassport.length, detail: `${missingPassport.length} jamaah without verified passport` });
    }

    const incompleteDocs = allJamaah.filter((j: any) => j.dokumen.filter((d: any) => d.wajib).some((d: any) => d.status !== "verified" && d.status !== "lengkap"));
    if (incompleteDocs.length > 0) {
      warnings.push({ label: "Incomplete Documents", count: incompleteDocs.length, detail: `${incompleteDocs.length} jamaah with incomplete required documents` });
    }

    if (!hasRooming) {
      warnings.push({ label: "No Rooming Assignment", count: allJamaah.length, detail: "Rooming has not been generated for this departure" });
    }

    return {
      canFinalize: blockers.length === 0,
      blockers,
      warnings,
    };
  },

  async getReadinessScore(keberangkatanId: string): Promise<PackageReadinessScore> {
    const row = await keberangkatanRepo.getForReadiness(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const allJamaah = row.groups.flatMap((g: any) => g.anggota);
    const totalJamaah = allJamaah.length || 1;

    const paymentScore = row.groups.reduce((sum: number, g: any) => sum + (g.totalTagihan > 0 ? g.totalPembayaran / g.totalTagihan : 1), 0) / (row.groups.length || 1) * 100;
    const documentScore = allJamaah.filter((j: any) => j.dokumen.filter((d: any) => d.wajib).every((d: any) => d.status === "verified" || d.status === "lengkap")).length / totalJamaah * 100;
    const manifestScore = row.manifests.length > 0 ? (row.manifests.filter((m: any) => m.status === "final" || m.status === "submitted").length / row.manifests.length) * 100 : 0;
    const roomingScore = row.roomings.length > 0 ? (row.roomings.filter((r: any) => r.status === "final").length / row.roomings.length) * 100 : 0;
    const operationalScore = row.status === "ready" || row.status === "departed" ? 100 : row.status === "preparing" ? 50 : 0;

    const scores = [
      { label: "Pembayaran", score: paymentScore, weight: 30 },
      { label: "Dokumen", score: documentScore, weight: 25 },
      { label: "Manifest", score: manifestScore, weight: 20 },
      { label: "Rooming", score: roomingScore, weight: 15 },
      { label: "Operasional", score: operationalScore, weight: 10 },
    ];

    const overallScore = scores.reduce((sum: number, s: any) => sum + (s.score * s.weight) / 100, 0);

    return {
      overallScore: Math.round(overallScore),
      paymentScore: Math.round(paymentScore),
      documentScore: Math.round(documentScore),
      manifestScore: Math.round(manifestScore),
      roomingScore: Math.round(roomingScore),
      operationalScore: Math.round(operationalScore),
      breakdown: scores.map((s: any) => ({ ...s, score: Math.round(s.score) })),
    };
  }
};
