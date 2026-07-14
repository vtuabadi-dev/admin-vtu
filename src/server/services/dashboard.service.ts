import { jamaahRepo, groupRepo } from "@/server/repositories";
import { packageService } from "@/server/services/package.service";

export const dashboardService = {
  async getStats() {
    const [statusCounts, groups, keberangkatan] = await Promise.all([
      jamaahRepo.countByStatus(),
      groupRepo.findAll({ limit: 100 }),
      packageService.findAll({ limit: 10 }),
    ]);

    return {
      totalJamaah: Object.values(statusCounts).reduce((a: number, b: any) => a + b, 0),
      totalGroup: groups.total,
      totalBerangkat: statusCounts["berangkat"] ?? 0,
      dokumenLengkap: (statusCounts["dokumen_verified"] ?? 0) + (statusCounts["ready"] ?? 0) + (statusCounts["berangkat"] ?? 0),
      dokumenKurang: (statusCounts["registered"] ?? 0) + (statusCounts["dokumen_upload"] ?? 0),
      pembayaranLunas: statusCounts["lunas"] ?? 0,
      pembayaranPending: (statusCounts["pembayaran_pending"] ?? 0) + (statusCounts["registered"] ?? 0),
      pembayaranOverdue: groups.data.filter((g: { sisaPembayaran: number }) => g.sisaPembayaran > 0).length,
      keberangkatanMendatang: keberangkatan.data.filter((k: { status: string }) => k.status === "scheduled" || k.status === "preparing").length,
    };
  },

  async getAlerts() {
    const [keberangkatan, groups] = await Promise.all([
      packageService.findAll({ limit: 10 }),
      groupRepo.findAll({ limit: 100 }),
    ]);

    const alerts: Array<{
      id: string;
      tipe: "warning" | "danger" | "info";
      pesan: string;
      jumlahTerdampak: number;
      module: string;
      link: string;
      createdAt: string;
    }> = [];

    const now = new Date();

    // Overdue groups
    const overdue = groups.data.filter((g: { sisaPembayaran: number }) => g.sisaPembayaran > 0);
    if (overdue.length > 0) {
      alerts.push({
        id: "alert-overdue",
        tipe: "danger",
        pesan: `${overdue.length} grup memiliki sisa pembayaran`,
        jumlahTerdampak: overdue.length,
        module: "pembayaran",
        link: "/admin/pembayaran/laporan",
        createdAt: now.toISOString(),
      });
    }

    // Upcoming departures
    const upcoming = keberangkatan.data.filter(
      (k: { status: string; tanggalBerangkat: string }) => k.status === "scheduled" && new Date(k.tanggalBerangkat) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    if (upcoming.length > 0) {
      alerts.push({
        id: "alert-upcoming",
        tipe: "info",
        pesan: `${upcoming.length} keberangkatan dalam 30 hari`,
        jumlahTerdampak: upcoming.length,
        module: "keberangkatan",
        link: "/admin/keberangkatan",
        createdAt: now.toISOString(),
      });
    }

    return alerts;
  }
};
