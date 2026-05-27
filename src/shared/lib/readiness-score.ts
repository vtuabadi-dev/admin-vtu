import type { Keberangkatan, PackageIntelligence, AutoDeadline, PackageReadinessScore } from "@/shared/types";
import { getDeadlineStatus } from "./deadline-utils";

export function computePackageReadinessScore(
  keberangkatan: Keberangkatan,
  intel: PackageIntelligence,
  deadlines: AutoDeadline[]
): PackageReadinessScore {
  // Payment score (25%)
  const paymentRatio = keberangkatan.terisi > 0
    ? 1 - (intel.unpaidCount / keberangkatan.terisi)
    : 0;
  const paymentScore = Math.round(paymentRatio * 100);

  // Document score (25%)
  const docRatio = keberangkatan.terisi > 0
    ? 1 - (intel.dokumenPending / keberangkatan.terisi)
    : 0;
  const documentScore = Math.round(docRatio * 100);

  // Manifest score (20%)
  const manifestRatio = keberangkatan.terisi > 0
    ? 1 - (intel.manifestIncomplete / Math.max(keberangkatan.terisi, 1))
    : 0;
  const manifestScore = Math.round(Math.min(manifestRatio * 100, 100));

  // Rooming score (20%)
  const roomingScore = keberangkatan.terisi > 0
    ? Math.round((1 - (intel.roomingIncomplete / keberangkatan.terisi)) * 100)
    : 0;

  // Operational score (10%) — based on deadlines
  const totalDeadlines = deadlines.length;
  const passedDeadlines = deadlines.filter((d) => getDeadlineStatus(d) !== "overdue").length;
  const operationalScore = totalDeadlines > 0
    ? Math.round((passedDeadlines / totalDeadlines) * 100)
    : 100;

  // Weighted overall
  const overallScore = Math.round(
    paymentScore * 0.25 +
    documentScore * 0.25 +
    manifestScore * 0.20 +
    roomingScore * 0.20 +
    operationalScore * 0.10
  );

  return {
    overallScore,
    paymentScore,
    documentScore,
    manifestScore,
    roomingScore,
    operationalScore,
    breakdown: [
      { label: "Pembayaran", score: paymentScore, weight: 25 },
      { label: "Dokumen", score: documentScore, weight: 25 },
      { label: "Manifest", score: manifestScore, weight: 20 },
      { label: "Rooming", score: roomingScore, weight: 20 },
      { label: "Operasional", score: operationalScore, weight: 10 },
    ],
  };
}

export function getScoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}

export type ReadinessLevel = "READY" | "WARNING" | "CRITICAL" | "BLOCKED";

export function getReadinessLevel(score: PackageReadinessScore): ReadinessLevel {
  if (score.overallScore >= 80 && score.paymentScore >= 60 && score.documentScore >= 60) {
    return "READY";
  }
  if (score.overallScore < 30 || score.paymentScore < 30 || score.documentScore < 30) {
    return "BLOCKED";
  }
  if (score.overallScore < 50 || score.paymentScore < 50 || score.documentScore < 50) {
    return "CRITICAL";
  }
  return "WARNING";
}

export function getReadinessLevelColor(level: ReadinessLevel): string {
  switch (level) {
    case "READY":
      return "text-success bg-success/10 border-success/20";
    case "WARNING":
      return "text-warning bg-warning/10 border-warning/20";
    case "CRITICAL":
      return "text-destructive bg-destructive/10 border-destructive/20";
    case "BLOCKED":
      return "text-destructive bg-destructive/20 border-destructive/30";
  }
}

export function getReadinessLabel(level: ReadinessLevel): string {
  switch (level) {
    case "READY":
      return "Siap Berangkat";
    case "WARNING":
      return "Perlu Perhatian";
    case "CRITICAL":
      return "Kritis";
    case "BLOCKED":
      return "Tertahan";
  }
}
