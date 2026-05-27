import type { Reminder } from "@/shared/types";
import type { ReminderStats } from "./contracts";

export function computeReminderStats(
  reminders: Reminder[],
  tipe?: "pembayaran" | "dokumen"
): ReminderStats {
  const filtered = tipe
    ? reminders.filter((r) => r.tipe === tipe)
    : reminders;

  return {
    total: filtered.length,
    sent: filtered.filter((r) => r.status === "sent").length,
    read: filtered.filter((r) => r.status === "read").length,
    responded: filtered.filter((r) => r.status === "responded").length,
  };
}

export function filterRemindersByType(
  reminders: Reminder[],
  tipe: "pembayaran" | "dokumen"
): Reminder[] {
  return reminders.filter((r) => r.tipe === tipe);
}

export function renderReminderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}
