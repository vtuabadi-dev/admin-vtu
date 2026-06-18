import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { jamaahRepo, groupRepo, keberangkatanRepo } from "@/server/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const [statusCounts, groups, keberangkatan] = await Promise.all([
      jamaahRepo.countByStatus(),
      groupRepo.findAll({ limit: 100 }),
      keberangkatanRepo.findAll({ limit: 10 }),
    ]);

    const stats = {
      totalJamaah: Object.values(statusCounts).reduce((a: number, b: any) => a + b, 0),
      totalGroup: groups.total,
      totalBerangkat: statusCounts["berangkat"] ?? 0,
      dokumenLengkap: statusCounts["dokumen_verified"] ?? 0 + (statusCounts["ready"] ?? 0) + (statusCounts["berangkat"] ?? 0),
      dokumenKurang: (statusCounts["registered"] ?? 0) + (statusCounts["dokumen_upload"] ?? 0),
      pembayaranLunas: statusCounts["lunas"] ?? 0,
      pembayaranPending: (statusCounts["pembayaran_pending"] ?? 0) + (statusCounts["registered"] ?? 0),
      pembayaranOverdue: groups.data.filter((g: { sisaPembayaran: number }) => g.sisaPembayaran > 0).length,
      keberangkatanMendatang: keberangkatan.data.filter((k: { status: string }) => k.status === "scheduled" || k.status === "preparing").length,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

