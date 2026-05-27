import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { ExportGeneratorJob } from "@/services/queue/types";
import { generateExport, type ExportType } from "@/server/services/export-gen.service";

function normalizeRows(result: any): Record<string, unknown>[] {
  if (Array.isArray(result)) return result;
  if (result?.data && Array.isArray(result.data)) return result.data;
  if (result?.rows && Array.isArray(result.rows)) return result.rows;
  return [];
}

const worker = new Worker(
  "export-generator",
  async (job) => {
    const data = job.data as ExportGeneratorJob["data"];
    console.log(`[Export Worker] Generating ${data.format} export of type ${data.exportType}`);

    await job.updateProgress({ current: 1, total: 3, percent: 33, label: "Fetching data..." });

    let rows: Record<string, unknown>[] = [];

    try {
      const repos = await import("@/server/repositories");

      switch (data.exportType as ExportType) {
        case "jamaah":
          rows = normalizeRows(await repos.jamaahRepo.findAll());
          break;
        case "manifest":
          rows = normalizeRows(await repos.manifestRepo.findAll());
          break;
        case "rooming":
          rows = normalizeRows(await repos.roomingRepo.findAll());
          break;
        case "invoice":
          rows = normalizeRows(await repos.invoiceRepo.findAll());
          break;
        case "payment":
          rows = normalizeRows(await repos.pembayaranRepo.findAll());
          break;
        case "dokumen": {
          const jamaahList = normalizeRows(await repos.jamaahRepo.findAll());
          const allDokumen: any[] = [];
          for (const j of jamaahList) {
            const docs = await repos.dokumenRepo.findByJamaah(j.id as string);
            allDokumen.push(...docs.map((d: any) => ({ ...d, namaJamaah: j.namaLengkap })));
          }
          rows = allDokumen;
          break;
        }
        default:
          rows = normalizeRows(await repos.jamaahRepo.findAll());
      }
    } catch {
      rows = [{ message: "Database not available — exporting empty dataset" }];
    }

    await job.updateProgress({ current: 2, total: 3, percent: 66, label: `Generating ${data.format.toUpperCase()}...` });

    const result = await generateExport(
      {
        id: job.id || `export-${Date.now()}`,
        format: data.format,
        exportType: data.exportType,
        requestedBy: data.requestedBy,
        filters: data.filters,
      },
      rows
    );

    await job.updateProgress({ current: 3, total: 3, percent: 100, label: "Complete" });

    return { success: true, ...result };
  },
  {
    connection: connectionOptions,
    concurrency: 2,
    autorun: true,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Export Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Export Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
