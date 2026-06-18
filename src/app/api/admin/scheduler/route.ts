import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { sendNotification } from "@/server/services/notify";

// POST /api/admin/scheduler — trigger automated reminder checks
// Designed to be called by cron: curl -X POST http://localhost:3000/api/admin/scheduler
// VTU Core — reminder dikirim langsung (sync), tanpa BullMQ queue.
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const { prisma } = await import("@/server/db/client");
    const now = new Date();
    const results: {
      type: string;
      invoiceId: string;
      nomorInvoice: string;
      delivered: number;
      failed: number;
    }[] = [];

    const readableType: Record<string, string> = {
      h7: "Pengingat pembayaran — 7 hari sebelum jatuh tempo",
      h3: "Pengingat pembayaran — 3 hari sebelum jatuh tempo",
      overdue: "Peringatan — invoice sudah melewati jatuh tempo",
    };

    // 1. Invoices due in 7 days — H-7 reminder
    const h7Date = new Date(now.getTime() + 7 * 86400000);
    const h7Invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial"] },
        jatuhTempo: { gte: new Date(h7Date.getTime() - 86400000), lte: h7Date },
      },
      include: {
        group: {
          include: {
            anggota: { select: { id: true, namaLengkap: true, nomorTelepon: true, email: true } },
          },
        },
      },
    });
    for (const inv of h7Invoices) {
      const [delivered, failed] = await sendReminders(inv, "h7", readableType);
      results.push({ type: "h7", invoiceId: inv.id, nomorInvoice: inv.nomorInvoice, delivered, failed });
    }

    // 2. Invoices due in 3 days — H-3 reminder
    const h3Date = new Date(now.getTime() + 3 * 86400000);
    const h3Invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial"] },
        jatuhTempo: { gte: new Date(h3Date.getTime() - 86400000), lte: h3Date },
      },
      include: {
        group: {
          include: {
            anggota: { select: { id: true, namaLengkap: true, nomorTelepon: true, email: true } },
          },
        },
      },
    });
    for (const inv of h3Invoices) {
      const [delivered, failed] = await sendReminders(inv, "h3", readableType);
      results.push({ type: "h3", invoiceId: inv.id, nomorInvoice: inv.nomorInvoice, delivered, failed });
    }

    // 3. Overdue invoices — overdue reminder
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial", "overdue"] },
        jatuhTempo: { lt: now },
      },
      include: {
        group: {
          include: {
            anggota: { select: { id: true, namaLengkap: true, nomorTelepon: true, email: true } },
          },
        },
      },
    });
    for (const inv of overdueInvoices) {
      // Mark as overdue if not already
      if (inv.status !== "overdue") {
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "overdue" } });
      }
      const [delivered, failed] = await sendReminders(inv, "overdue", readableType);
      results.push({ type: "overdue", invoiceId: inv.id, nomorInvoice: inv.nomorInvoice, delivered, failed });
    }

    const totalDelivered = results.reduce((s, r) => s + r.delivered, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);

    return NextResponse.json({
      success: true,
      data: {
        invoicesProcessed: results.length,
        totalDelivered,
        totalFailed,
        breakdown: {
          h7: { count: results.filter((r) => r.type === "h7").length, delivered: results.filter((r) => r.type === "h7").reduce((s, r) => s + r.delivered, 0) },
          h3: { count: results.filter((r) => r.type === "h3").length, delivered: results.filter((r) => r.type === "h3").reduce((s, r) => s + r.delivered, 0) },
          overdue: { count: results.filter((r) => r.type === "overdue").length, delivered: results.filter((r) => r.type === "overdue").reduce((s, r) => s + r.delivered, 0) },
        },
        details: results,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

// ── Helper: kirim reminder ke semua anggota group ──────────────

async function sendReminders(
  invoice: {
    id: string;
    nomorInvoice: string;
    jumlah: number;
    sisaTagihan: number;
    jatuhTempo: Date;
    group: {
      anggota: {
        id: string;
        namaLengkap: string;
        nomorTelepon: string | null;
        email: string | null;
      }[];
    };
  },
  reminderType: string,
  readableType: Record<string, string>,
): Promise<[delivered: number, failed: number]> {
  const body = `${readableType[reminderType] ?? "Pengingat pembayaran"}\n\nInvoice: ${invoice.nomorInvoice}\nJumlah: Rp${invoice.jumlah.toLocaleString("id-ID")}\nSisa: Rp${invoice.sisaTagihan.toLocaleString("id-ID")}\nJatuh Tempo: ${invoice.jatuhTempo.toISOString().split("T")[0]}`;

  let delivered = 0;
  let failed = 0;

  for (const jamaah of invoice.group.anggota) {
    const channel = jamaah.nomorTelepon ? ("whatsapp" as const) : ("email" as const);
    const recipient = jamaah.nomorTelepon || jamaah.email;
    if (!recipient) {
      failed++;
      continue;
    }

    try {
      await sendNotification({
        channel,
        recipient,
        subject: `Pengingat Pembayaran — Invoice ${invoice.nomorInvoice}`,
        body,
        metadata: { jamaahId: jamaah.id, invoiceId: invoice.id, reminderType },
      });
      delivered++;
    } catch {
      failed++;
    }
  }

  return [delivered, failed];
}
