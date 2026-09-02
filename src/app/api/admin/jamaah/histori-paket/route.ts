import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

export interface PackageHistoryEvent {
  id: string;
  timestamp: string;
  actionType: "MASUK_BARU" | "CANCEL" | "PINDAH_PAKET_KELUAR" | "PINDAH_PAKET_MASUK";
  actionLabel: string;
  namaJamaah: string;
  nomorPeserta?: string;
  keterangan: string;
  paketAsalOrTujuan?: string;
  actorName: string;
}

export interface PackageHistoryItem {
  paketId: string;
  namaPaket: string;
  kodeKeberangkatan: string;
  tanggalBerangkat: string;
  maskapaiName?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
  totalJamaahAktif: number;
  totalAksi: number;
  summary: {
    masukBaru: number;
    cancel: number;
    pindahPaket: number;
  };
  actions: PackageHistoryEvent[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const actionTypeParam = searchParams.get("actionType") || "ALL";
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // Parse date filters
    const startDate: Date | null = startDateParam ? new Date(startDateParam) : null;
    const endDate: Date | null = endDateParam ? new Date(`${endDateParam}T23:59:59.999Z`) : null;

    // Query Keberangkatan & related registration requests & audit entries
    const [keberangkatans, auditEntries] = await Promise.all([
      prisma.keberangkatan.findMany({
        include: {
          registrationRequests: {
            include: {
              members: true,
            },
          },
          activityEvents: true,
        },
        orderBy: { tanggalBerangkat: "asc" },
      }),
      prisma.auditEntry.findMany({
        where: {
          module: { in: ["jamaah", "keberangkatan"] },
        },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    const result: PackageHistoryItem[] = [];

    for (const keb of keberangkatans) {
      const actions: PackageHistoryEvent[] = [];

      // A. Extract entries from RegistrationRequests
      if (keb.registrationRequests && keb.registrationRequests.length > 0) {
        for (const req of keb.registrationRequests) {
          const reqDate = new Date(req.createdAt);

          // Action 1: New Jamaah Entry (Masuk Jamaah Baru)
          if (req.status !== "CANCELLED" && req.status !== "REJECTED") {
            const mainName = req.namaPerwakilan;
            const paxInfo = req.paxCount > 1 ? ` (${req.paxCount} Pax Rombongan)` : "";

            actions.push({
              id: `reg-${req.id}`,
              timestamp: reqDate.toISOString(),
              actionType: "MASUK_BARU",
              actionLabel: "Masuk Jamaah Baru",
              namaJamaah: `${mainName}${paxInfo}`,
              nomorPeserta: req.kodeRegistrasi,
              keterangan: `Pendaftaran jamaah baru pada paket ${keb.namaPaket}`,
              actorName: req.reviewedBy || "Sistem Registrasi Online",
            });
          }

          // Action 2: Cancelled / Refunded Jamaah (Keluar Cancel)
          if (req.status === "CANCELLED" || req.status === "REJECTED") {
            const cancelDate = req.updatedAt || req.createdAt;
            actions.push({
              id: `cancel-${req.id}`,
              timestamp: new Date(cancelDate).toISOString(),
              actionType: "CANCEL",
              actionLabel: "Keluar (Pembatalan / Cancel)",
              namaJamaah: req.namaPerwakilan,
              nomorPeserta: req.kodeRegistrasi,
              keterangan: req.catatanAdmin || `Pembatalan pendaftaran jamaah dari paket ${keb.namaPaket}`,
              actorName: req.reviewedBy || "Admin Operasional",
            });
          }
        }
      }

      // B. Extract actions from ActivityEvents
      if (keb.activityEvents && keb.activityEvents.length > 0) {
        for (const ev of keb.activityEvents) {
          const evDate = new Date(ev.timestamp);
          const evMsgLower = ev.message.toLowerCase();

          if (evMsgLower.includes("pindah") || evMsgLower.includes("transfer")) {
            const isTransferOut = evMsgLower.includes("keluar") || evMsgLower.includes("ke paket");
            actions.push({
              id: `act-${ev.id}`,
              timestamp: evDate.toISOString(),
              actionType: isTransferOut ? "PINDAH_PAKET_KELUAR" : "PINDAH_PAKET_MASUK",
              actionLabel: isTransferOut ? "Keluar (Pindah Paket)" : "Masuk (Pindah Paket)",
              namaJamaah: ev.triggeredBy || "Jamaah Operasional",
              keterangan: ev.message,
              actorName: ev.triggeredBy || "Admin Operasional",
            });
          } else if (evMsgLower.includes("cancel") || evMsgLower.includes("batal")) {
            actions.push({
              id: `act-cancel-${ev.id}`,
              timestamp: evDate.toISOString(),
              actionType: "CANCEL",
              actionLabel: "Keluar (Pembatalan / Cancel)",
              namaJamaah: "Jamaah Terdaftar",
              keterangan: ev.message,
              actorName: ev.triggeredBy || "Admin Operasional",
            });
          }
        }
      }

      // C. Extract audit entries related to this package
      const relevantAudit = auditEntries.filter(
        (ae) => ae.entityId === keb.id || ae.detail.toLowerCase().includes(keb.kode.toLowerCase())
      );

      for (const ae of relevantAudit) {
        const aeLower = ae.detail.toLowerCase();
        if (aeLower.includes("pindah") || aeLower.includes("transfer")) {
          actions.push({
            id: `audit-${ae.id}`,
            timestamp: new Date(ae.timestamp).toISOString(),
            actionType: aeLower.includes("ke paket") ? "PINDAH_PAKET_KELUAR" : "PINDAH_PAKET_MASUK",
            actionLabel: aeLower.includes("ke paket") ? "Keluar (Pindah Paket)" : "Masuk (Pindah Paket)",
            namaJamaah: ae.userName || "Admin",
            keterangan: ae.detail,
            actorName: ae.userName || ae.role,
          });
        }
      }

      // Filter actions by date range & action type & search
      const filteredActions = actions.filter((act) => {
        const actTime = new Date(act.timestamp).getTime();

        if (startDate && actTime < startDate.getTime()) return false;
        if (endDate && actTime > endDate.getTime()) return false;

        // Filter by actionType
        if (actionTypeParam === "MASUK_BARU" && act.actionType !== "MASUK_BARU") return false;
        if (actionTypeParam === "CANCEL" && act.actionType !== "CANCEL") return false;
        if (
          actionTypeParam === "PINDAH_PAKET" &&
          act.actionType !== "PINDAH_PAKET_KELUAR" &&
          act.actionType !== "PINDAH_PAKET_MASUK"
        )
          return false;

        // Filter by search query
        if (searchQuery) {
          const matchPkgName = keb.namaPaket.toLowerCase().includes(searchQuery);
          const matchPkgCode = keb.kode.toLowerCase().includes(searchQuery);
          const matchJamaah = act.namaJamaah.toLowerCase().includes(searchQuery);
          const matchKet = act.keterangan.toLowerCase().includes(searchQuery);
          return matchPkgName || matchPkgCode || matchJamaah || matchKet;
        }

        return true;
      });

      // Sort actions descending (newest first)
      filteredActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // RULE: EXCLUDE PACKAGE IF IT HAS NO ACTIONS AFTER FILTERING
      if (filteredActions.length === 0) {
        continue;
      }

      // Calculate summary counts
      const masukBaruCount = filteredActions.filter((a) => a.actionType === "MASUK_BARU").length;
      const cancelCount = filteredActions.filter((a) => a.actionType === "CANCEL").length;
      const pindahCount = filteredActions.filter(
        (a) => a.actionType === "PINDAH_PAKET_KELUAR" || a.actionType === "PINDAH_PAKET_MASUK"
      ).length;

      // Calculate total active jamaah in package
      const totalJamaahAktif = (keb.registrationRequests || [])
        .filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED")
        .reduce((sum, r) => sum + r.paxCount, 0);

      const tglParts = new Date(keb.tanggalBerangkat).toISOString().split("T");

      result.push({
        paketId: keb.id,
        namaPaket: keb.namaPaket,
        kodeKeberangkatan: keb.kode,
        tanggalBerangkat: tglParts[0] || "",
        maskapaiName: keb.maskapaiId || keb.maskapai || undefined,
        hotelMekkah: keb.hotelMekkahId || keb.hotelMekkah || undefined,
        hotelMadinah: keb.hotelMadinahId || keb.hotelMadinah || undefined,
        totalJamaahAktif: totalJamaahAktif || keb.terisi || 0,
        totalAksi: filteredActions.length,
        summary: {
          masukBaru: masukBaruCount,
          cancel: cancelCount,
          pindahPaket: pindahCount,
        },
        actions: filteredActions,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        totalPaketDenganAksi: result.length,
        startDate: startDateParam,
        endDate: endDateParam,
        actionType: actionTypeParam,
      },
    });
  } catch (error) {
    console.error("[HISTORI PAKET API ERROR]", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
