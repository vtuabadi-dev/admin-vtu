import type { Jamaah, GroupPaymentSummary, StatusJamaah } from "@/shared/types";
import { computeDocumentCompleteness } from "./document-utils";

export function deriveAutoStatus(
  jamaah: Jamaah,
  paymentSummary: GroupPaymentSummary | null,
  hasManifest: boolean,
  hasRooming: boolean
): StatusJamaah {
  const { allMandatoryComplete } = computeDocumentCompleteness(jamaah.dokumen);
  const isLunas = paymentSummary?.status === "lunas";

  // BLOCKED / BATAL
  if (jamaah.status === "batal") return "batal";

  // READY TO DEPART
  if (allMandatoryComplete && isLunas && hasRooming && hasManifest) return "ready";

  // LUNAS
  if (isLunas && allMandatoryComplete) return "lunas";

  // DOKUMEN VERIFIED
  if (allMandatoryComplete) return "dokumen_verified";

  // PEMBAYARAN PENDING
  if (paymentSummary && !isLunas && allMandatoryComplete) return "pembayaran_pending";

  // DOKUMEN UPLOAD
  if (jamaah.dokumen.length > 0 && !allMandatoryComplete) return "dokumen_upload";

  // Default: still registered
  return jamaah.status;
}

export function getStatusSequence(): StatusJamaah[] {
  return [
    "registered",
    "dokumen_upload",
    "dokumen_verified",
    "pembayaran_pending",
    "lunas",
    "ready",
    "berangkat",
  ];
}

export function isStatusAfter(a: StatusJamaah, b: StatusJamaah): boolean {
  const seq = getStatusSequence();
  return seq.indexOf(a) > seq.indexOf(b);
}
