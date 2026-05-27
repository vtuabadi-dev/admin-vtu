import type { Jamaah, JamaahProgress, ProgressStep } from "@/shared/types";

export const PROGRESS_STEPS: { key: string; label: string; order: number }[] = [
  { key: "registered", label: "Registrasi", order: 1 },
  { key: "payment", label: "Pembayaran", order: 2 },
  { key: "documents", label: "Dokumen", order: 3 },
  { key: "ocr", label: "OCR Verified", order: 4 },
  { key: "manifest", label: "Manifest", order: 5 },
  { key: "rooming", label: "Rooming", order: 6 },
  { key: "ready", label: "Ready To Depart", order: 7 },
];

const STEP_ORDER: Record<string, number> = {
  registered: 0,
  dokumen_upload: 1,
  dokumen_verified: 2,
  pembayaran_pending: 3,
  lunas: 4,
  ready: 5,
  berangkat: 6,
};

export function computeJamaahProgress(jamaah: Jamaah): JamaahProgress {
  const currentIdx = STEP_ORDER[jamaah.status] ?? 0;

  const steps: ProgressStep[] = PROGRESS_STEPS.map((s) => {
    const stepIdx = s.order - 1;
    let status: "completed" | "current" | "pending";
    if (stepIdx < currentIdx) status = "completed";
    else if (stepIdx === currentIdx) status = "current";
    else status = "pending";
    return { key: s.key, label: s.label, status, order: s.order };
  });

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;

  return {
    steps,
    currentStep: steps[currentIdx]?.key ?? "registered",
    completedSteps,
    totalSteps,
    percentComplete: Math.round((completedSteps / totalSteps) * 100),
  };
}
