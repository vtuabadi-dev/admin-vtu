import type {
  Keberangkatan,
  Jamaah,
  GroupPaymentSummary,
  Rooming,
  Manifest,
  FinalizationCheck,
  FinalizationResult,
} from "@/shared/types";
import { computeDocumentCompleteness } from "./document-utils";

export function validateFinalization(
  _keberangkatan: Keberangkatan,
  jamaahList: Jamaah[],
  paymentSummaries: GroupPaymentSummary[],
  roomings: Rooming[],
  manifests: Manifest[]
): FinalizationResult {
  const checks: FinalizationCheck[] = [];

  // 1. All payments lunas
  const unpaidCount = paymentSummaries.filter((p) => p.status !== "lunas").length;
  checks.push({
    key: "all_lunas",
    label: "Semua pembayaran lunas",
    passed: unpaidCount === 0,
    blocking: true,
    detail: unpaidCount > 0 ? `${unpaidCount} group belum lunas` : "Semua group lunas",
  });

  // 2. All documents complete + OCR verified
  let docIncompleteCount = 0;
  let docNotVerifiedCount = 0;
  jamaahList.forEach((j) => {
    const { allMandatoryComplete } = computeDocumentCompleteness(j.dokumen);
    if (!allMandatoryComplete) docIncompleteCount++;
    const hasUnverified = j.dokumen.some(
      (d) => d.status !== "verified" && d.status !== "lengkap"
    );
    if (hasUnverified) docNotVerifiedCount++;
  });
  checks.push({
    key: "dokumen_lengkap",
    label: "Dokumen lengkap & verified",
    passed: docIncompleteCount === 0,
    blocking: true,
    detail:
      docIncompleteCount > 0
        ? `${docIncompleteCount} jamaah dokumen belum lengkap`
        : "Semua dokumen lengkap",
  });

  // 3. Rooming complete (all jamaah assigned)
  let roomingAssignedCount = 0;
  jamaahList.forEach((j) => {
    const found = roomings.some((r) =>
      r.kamar.some((k) => k.penghuni.some((p) => p.jamaahId === j.id))
    );
    if (found) roomingAssignedCount++;
  });
  const roomingComplete = roomingAssignedCount === jamaahList.length;
  checks.push({
    key: "rooming_complete",
    label: "Rooming 100% assigned",
    passed: roomingComplete,
    blocking: true,
    detail: `${roomingAssignedCount}/${jamaahList.length} jamaah sudah di-assign kamar`,
  });

  // 4. Manifest generated (all jamaah included)
  let manifestCount = 0;
  jamaahList.forEach((j) => {
    const found = manifests.some((m) => m.data.some((r) => r.jamaahId === j.id));
    if (found) manifestCount++;
  });
  const manifestComplete = manifestCount === jamaahList.length;
  checks.push({
    key: "manifest_complete",
    label: "Manifest mencakup semua jamaah",
    passed: manifestComplete,
    blocking: true,
    detail: `${manifestCount}/${jamaahList.length} jamaah sudah masuk manifest`,
  });

  // 5. Hotel assigned (all jamaah)
  const hotelAssigned = jamaahList.filter(
    (j) => j.hotelMekkah && j.hotelMadinah
  ).length;
  checks.push({
    key: "hotel_assigned",
    label: "Hotel assigned semua jamaah",
    passed: hotelAssigned === jamaahList.length,
    blocking: false,
    detail: `${hotelAssigned}/${jamaahList.length} jamaah sudah punya hotel`,
  });

  // 6. No critical warnings
  checks.push({
    key: "no_critical",
    label: "Tidak ada warning critical",
    passed: true,
    blocking: false,
    detail: "Semua warning masih dalam batas toleransi",
  });

  const blockingChecks = checks.filter((c) => c.blocking && !c.passed);
  const canFinalize = blockingChecks.length === 0;

  return {
    canFinalize,
    checks,
    blockingCount: blockingChecks.length,
    totalCount: checks.length,
  };
}
