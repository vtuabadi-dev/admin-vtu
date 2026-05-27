import type { Keberangkatan, OperationalMilestone } from "@/shared/types";
import { formatDate } from "./utils";

export function computeOperationalTimeline(
  keberangkatan: Keberangkatan
): OperationalMilestone[] {
  const tglBerangkat = new Date(keberangkatan.tanggalBerangkat);
  const now = new Date();

  function daysBefore(days: number): Date {
    const d = new Date(tglBerangkat);
    d.setDate(d.getDate() - days);
    return d;
  }

  function mkMilestone(
    key: string,
    label: string,
    offsetDays: number,
    type: "deadline" | "reminder" | "event",
    urgentThreshold: number,
    description?: string
  ): OperationalMilestone {
    const tanggal = daysBefore(offsetDays);
    return {
      key,
      label,
      tanggal: formatDate(tanggal),
      type,
      passed: now > tanggal,
      urgent: now > daysBefore(urgentThreshold),
      description,
    };
  }

  return [
    mkMilestone(
      "open_registration",
      "Open Registration",
      90,
      "event",
      90,
      `Pendaftaran jamaah dibuka untuk paket ${keberangkatan.namaPaket}`
    ),
    mkMilestone(
      "reminder_pelunasan",
      "Reminder Pelunasan",
      60,
      "reminder",
      40,
      "Kirim reminder pelunasan ke seluruh jamaah"
    ),
    mkMilestone(
      "deadline_pelunasan",
      "Deadline Pelunasan",
      40,
      "deadline",
      30,
      "Batas akhir pelunasan seluruh pembayaran"
    ),
    mkMilestone(
      "final_manifest",
      "Final Manifest",
      30,
      "deadline",
      20,
      "Manifest harus sudah difinalisasi"
    ),
    mkMilestone(
      "rooming_final",
      "Rooming Final",
      14,
      "deadline",
      10,
      "Pembagian kamar harus sudah final"
    ),
    mkMilestone(
      "final_checking",
      "Final Checking",
      7,
      "event",
      3,
      "Pengecekan akhir semua dokumen dan kesiapan"
    ),
  ];
}

export function getMilestoneVariant(
  milestone: OperationalMilestone
): "success" | "warning" | "destructive" | "default" {
  if (milestone.passed && !milestone.urgent) return "success";
  if (milestone.urgent) return "destructive";
  if (milestone.type === "deadline" && !milestone.passed) return "warning";
  return "default";
}
