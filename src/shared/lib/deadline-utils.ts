import type { Keberangkatan, AutoDeadline } from "@/shared/types";

export function computeAutoDeadlines(keberangkatan: Keberangkatan): AutoDeadline[] {
  const tglBerangkat = new Date(keberangkatan.tanggalBerangkat);

  function daysBefore(days: number): string {
    const d = new Date(tglBerangkat);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  const now = new Date();

  const deadlines: AutoDeadline[] = [
    {
      id: `dl-pelunasan-${keberangkatan.id}`,
      keberangkatanId: keberangkatan.id,
      label: "Deadline Pelunasan",
      deadlineDate: daysBefore(40),
      type: "pelunasan",
      passed: now > new Date(daysBefore(40)),
      warningDays: 7,
    },
    {
      id: `dl-dokumen-${keberangkatan.id}`,
      keberangkatanId: keberangkatan.id,
      label: "Deadline Dokumen Lengkap",
      deadlineDate: daysBefore(30),
      type: "dokumen",
      passed: now > new Date(daysBefore(30)),
      warningDays: 7,
    },
    {
      id: `dl-manifest-${keberangkatan.id}`,
      keberangkatanId: keberangkatan.id,
      label: "Deadline Final Manifest",
      deadlineDate: daysBefore(20),
      type: "manifest",
      passed: now > new Date(daysBefore(20)),
      warningDays: 5,
    },
    {
      id: `dl-rooming-${keberangkatan.id}`,
      keberangkatanId: keberangkatan.id,
      label: "Deadline Final Rooming",
      deadlineDate: daysBefore(14),
      type: "rooming",
      passed: now > new Date(daysBefore(14)),
      warningDays: 3,
    },
    {
      id: `dl-finalisasi-${keberangkatan.id}`,
      keberangkatanId: keberangkatan.id,
      label: "Deadline Finalisasi Paket",
      deadlineDate: daysBefore(5),
      type: "finalisasi",
      passed: now > new Date(daysBefore(5)),
      warningDays: 2,
    },
  ];

  return deadlines;
}

export function getDeadlineStatus(deadline: AutoDeadline): "ok" | "warning" | "overdue" {
  if (deadline.passed) return "overdue";
  const now = new Date();
  const deadlineDate = new Date(deadline.deadlineDate);
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= deadline.warningDays) return "warning";
  return "ok";
}

export function getDeadlineVariant(status: "ok" | "warning" | "overdue"): "success" | "warning" | "destructive" {
  switch (status) {
    case "ok":
      return "success";
    case "warning":
      return "warning";
    case "overdue":
      return "destructive";
  }
}
