import type { Invoice, RegistrationGroup } from "@/shared/types";
import type { OverdueInvoice, OverdueStats } from "./contracts";

export function computeOverdueInvoices(
  invoices: Invoice[],
  groups: RegistrationGroup[]
): OverdueInvoice[] {
  const now = Date.now();
  return invoices
    .filter((inv) => inv.status === "overdue")
    .map((inv) => {
      const group = groups.find((g) => g.id === inv.groupId);
      const daysOverdue = Math.floor(
        (now - new Date(inv.jatuhTempo).getTime()) / 86_400_000
      );
      return {
        invoice: inv,
        groupName: group?.namaGroup ?? "-",
        groupCode: group?.kodeRegistrasi ?? "-",
        daysOverdue,
      };
    });
}

export function computeOverdueStats(
  overdueInvoices: OverdueInvoice[]
): OverdueStats {
  const totalAmount = overdueInvoices.reduce(
    (sum, item) => sum + item.invoice.sisaTagihan,
    0
  );
  const affectedGroups = new Set(
    overdueInvoices.map((item) => item.invoice.groupId)
  ).size;
  return {
    count: overdueInvoices.length,
    totalAmount,
    affectedGroups,
  };
}

export function filterOverdueInvoicesByPackage(
  overdueInvoices: OverdueInvoice[],
  groups: RegistrationGroup[],
  packageId: string | "all"
): OverdueInvoice[] {
  if (packageId === "all") return overdueInvoices;
  const groupIds = new Set(
    groups
      .filter((g) => g.paketKeberangkatanId === packageId)
      .map((g) => g.id)
  );
  return overdueInvoices.filter((item) => groupIds.has(item.invoice.groupId));
}
