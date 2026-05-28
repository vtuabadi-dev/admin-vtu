import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { enqueuePaymentReminder } from "@/server/queue/producer";
import type { PaymentReminderJob } from "@/services/queue/types";

// POST /api/admin/scheduler — trigger automated reminder checks
// Designed to be called by cron: curl -X POST http://localhost:3000/api/admin/scheduler
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
    const results: { type: string; invoiceId: string; jobId: string }[] = [];

    // 1. Invoices due in 7 days — H-7 reminder
    const h7Date = new Date(now.getTime() + 7 * 86400000);
    const h7Invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial"] },
        jatuhTempo: { gte: new Date(h7Date.getTime() - 86400000), lte: h7Date },
      },
      select: { id: true, groupId: true },
    });
    for (const inv of h7Invoices) {
      const job: PaymentReminderJob = {
        id: `remind-h7-${inv.id}-${Date.now()}`,
        queue: "payment-reminder",
        createdAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 2,
        data: { groupId: inv.groupId, invoiceId: inv.id, reminderType: "h7", channel: "email" },
      };
      const r = await enqueuePaymentReminder(job);
      results.push({ type: "h7", invoiceId: inv.id, jobId: r.jobId });
    }

    // 2. Invoices due in 3 days — H-3 reminder
    const h3Date = new Date(now.getTime() + 3 * 86400000);
    const h3Invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial"] },
        jatuhTempo: { gte: new Date(h3Date.getTime() - 86400000), lte: h3Date },
      },
      select: { id: true, groupId: true },
    });
    for (const inv of h3Invoices) {
      const job: PaymentReminderJob = {
        id: `remind-h3-${inv.id}-${Date.now()}`,
        queue: "payment-reminder",
        createdAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 2,
        data: { groupId: inv.groupId, invoiceId: inv.id, reminderType: "h3", channel: "email" },
      };
      const r = await enqueuePaymentReminder(job);
      results.push({ type: "h3", invoiceId: inv.id, jobId: r.jobId });
    }

    // 3. Overdue invoices — overdue reminder
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid", "partial", "overdue"] },
        jatuhTempo: { lt: now },
      },
      select: { id: true, groupId: true },
    });
    for (const inv of overdueInvoices) {
      // Mark as overdue if not already
      if (await prisma.invoice.findFirst({ where: { id: inv.id, status: { not: "overdue" } } })) {
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "overdue" } });
      }
      const job: PaymentReminderJob = {
        id: `remind-overdue-${inv.id}-${Date.now()}`,
        queue: "payment-reminder",
        createdAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        data: { groupId: inv.groupId, invoiceId: inv.id, reminderType: "overdue", channel: "whatsapp" },
      };
      const r = await enqueuePaymentReminder(job);
      results.push({ type: "overdue", invoiceId: inv.id, jobId: r.jobId });
    }

    return NextResponse.json({
      success: true,
      data: {
        enqueued: results.length,
        breakdown: {
          h7: results.filter((r) => r.type === "h7").length,
          h3: results.filter((r) => r.type === "h3").length,
          overdue: results.filter((r) => r.type === "overdue").length,
        },
        jobs: results,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
