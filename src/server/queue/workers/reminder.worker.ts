import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { PaymentReminderJob } from "@/services/queue/types";
import { sendNotification } from "@/server/services/notify";

const worker = new Worker(
  "payment-reminder",
  async (job) => {
    const data = job.data as PaymentReminderJob["data"];

    await job.updateProgress({ current: 1, total: 3, percent: 33, label: `Fetching invoice ${data.invoiceId}...` });

    // Resolve invoice and jamaah contacts from database
    const { prisma } = await import("@/server/db/client");
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { group: { include: { anggota: { select: { id: true, namaLengkap: true, nomorTelepon: true, email: true } } } } },
    });

    if (!invoice) {
      return { success: false, message: `Invoice ${data.invoiceId} not found` };
    }

    await job.updateProgress({ current: 2, total: 3, percent: 66, label: `Sending ${data.reminderType} reminder to ${invoice.group.anggota.length} jamaah...` });

    // Send via notification provider (mock in dev, real gateway in production)
    const results = [];
    for (const jamaah of invoice.group.anggota) {
      const readableType: Record<string, string> = {
        h7: "Pengingat pembayaran — 7 hari sebelum jatuh tempo",
        h3: "Pengingat pembayaran — 3 hari sebelum jatuh tempo",
        h1: "Pengingat pembayaran — 1 hari sebelum jatuh tempo",
        overdue: "Peringatan — invoice sudah melewati jatuh tempo",
      };

      const body = `${readableType[data.reminderType] ?? "Pengingat pembayaran"}\n\nInvoice: ${invoice.nomorInvoice}\nJumlah: Rp${invoice.jumlah.toLocaleString("id-ID")}\nSisa: Rp${invoice.sisaTagihan.toLocaleString("id-ID")}\nJatuh Tempo: ${invoice.jatuhTempo.toISOString().split("T")[0]}`;

      // Try WhatsApp first if phone available, fallback to email
      const channel = jamaah.nomorTelepon ? "whatsapp" as const : "email" as const;
      const recipient = jamaah.nomorTelepon || jamaah.email;

      try {
        const result = await sendNotification({
          channel,
          recipient,
          subject: `Pengingat Pembayaran — Invoice ${invoice.nomorInvoice}`,
          body,
          metadata: { jamaahId: jamaah.id, invoiceId: data.invoiceId, reminderType: data.reminderType },
        });
        results.push(result);
      } catch (err) {
        results.push({ success: false, channel, sentAt: new Date().toISOString(), error: (err as Error).message, retryable: true });
      }
    }

    const delivered = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await job.updateProgress({ current: 3, total: 3, percent: 100, label: `Reminder sent: ${delivered} delivered, ${failed} failed` });

    return {
      success: true,
      data: { reminderType: data.reminderType, invoiceId: data.invoiceId, channel: data.channel, delivered, failed, total: results.length },
      message: failed > 0 ? `${failed} notifications failed to send` : "All reminders dispatched",
    };
  },
  {
    connection: connectionOptions,
    concurrency: 5,
    autorun: true,
    lockDuration: 30000,
    stalledInterval: 30000,
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 500 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Reminder Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Reminder Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
