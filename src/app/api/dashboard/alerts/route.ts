import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { keberangkatanRepo, groupRepo } from "@/server/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const [keberangkatan, groups] = await Promise.all([
      keberangkatanRepo.findAll({ limit: 10 }),
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

    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

