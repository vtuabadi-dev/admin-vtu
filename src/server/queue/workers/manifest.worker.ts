import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { ManifestGenerateJob } from "@/services/queue/types";

// Minimal inline type for Prisma include results — avoids implicit any cascade
type JamaahWithDokumen = {
  id: string;
  namaLengkap: string;
  nomorPaspor?: string | null;
  hotelMekkah?: string | null;
  hotelMadinah?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: Date | string | null;
  dokumen: Array<{ jenis: string; status: string; wajib: boolean }>;
};

type GroupWithAnggota = { anggota: JamaahWithDokumen[] };

const worker = new Worker(
  "manifest-generate",
  async (job) => {
    const data = job.data as ManifestGenerateJob["data"];
    const { packageId, format, includeUnverified } = data;

    await job.updateProgress({ current: 1, total: 4, percent: 25, label: "Fetching keberangkatan & jamaah..." });

    // Dynamic imports — Prisma is server-only
    const { prisma } = await import("@/server/db/client");
    const { resolveOperationalName, resolveOperationalPaspor } = await import("@/shared/lib/name-resolver");

    const keberangkatan = await prisma.keberangkatan.findUnique({
      where: { id: packageId },
      include: {
        groups: {
          include: {
            anggota: {
              include: { dokumen: true },
              orderBy: { nomorPeserta: "asc" },
            },
          },
        },
      },
    });

    if (!keberangkatan) {
      throw new Error(`Keberangkatan ${packageId} not found`);
    }

    await job.updateProgress({ current: 2, total: 4, percent: 50, label: "Generating manifest rows..." });

    const allJamaah: JamaahWithDokumen[] = (keberangkatan.groups as unknown as GroupWithAnggota[]).flatMap((g) => g.anggota);

    // Filter: exclude unverified jamaah unless includeUnverified is set
    const eligibleJamaah = includeUnverified
      ? allJamaah
      : allJamaah.filter((j) => {
          const wajib = j.dokumen.filter((d) => d.wajib);
          return wajib.every((d) => d.status === "verified" || d.status === "lengkap");
        });

    // Group by hotel combination for SISKOPATUH manifests
    const hotelGroups = new Map<string, JamaahWithDokumen[]>();
    eligibleJamaah.forEach((j) => {
      const key = `${j.hotelMekkah ?? ""}||${j.hotelMadinah ?? ""}`;
      if (!hotelGroups.has(key)) hotelGroups.set(key, []);
      hotelGroups.get(key)!.push(j);
    });

    await job.updateProgress({ current: 3, total: 4, percent: 75, label: "Creating manifest records..." });

    const manifestRepo = (await import("@/server/repositories")).manifestRepo;
    const createdIds: string[] = [];

    const hotelEntries = Array.from(hotelGroups.entries());
    for (let idx = 0; idx < hotelEntries.length; idx++) {
      const [hotelKey, jamaahList] = hotelEntries[idx]!;
      const parts = hotelKey.split("||");
      const hotelMekkah = parts[0]!;
      const hotelMadinah = parts[1]!;

      const rows = jamaahList.map((j, i) => {
        const namaLengkap = resolveOperationalName(j, j.dokumen as any);
        const nomorPaspor = resolveOperationalPaspor(j.dokumen as any) ?? j.nomorPaspor;

        return {
          nomorUrut: i + 1,
          jamaahId: j.id,
          nomorPaspor,
          namaLengkap,
          tempatLahir: j.tempatLahir,
          tanggalLahir: j.tanggalLahir instanceof Date ? j.tanggalLahir.toISOString() : j.tanggalLahir,
        };
      });

      if (rows.length === 0) continue;

      const kodeSuffix = hotelGroups.size > 1 ? `-${hotelMekkah}-${hotelMadinah}` : "";
      const manifest = await manifestRepo.create({
        keberangkatanId: packageId,
        kode: `MAN-${keberangkatan.kode}${kodeSuffix}-${format}`,
        namaManifest: `${format.toUpperCase()} — ${keberangkatan.namaPaket}${hotelGroups.size > 1 ? ` (${hotelMekkah} / ${hotelMadinah})` : ""}`,
        templateId: undefined,
        hotelMekkah: hotelGroups.size > 1 ? hotelMekkah : undefined,
        hotelMadinah: hotelGroups.size > 1 ? hotelMadinah : undefined,
        status: "draft",
        rows,
      } as any);

      createdIds.push(manifest.id);
    }

    await job.updateProgress({ current: 4, total: 4, percent: 100, label: "Manifest generation complete" });

    return {
      success: true,
      data: { manifestIds: createdIds, count: createdIds.length, totalJamaah: eligibleJamaah.length },
    };
  },
  {
    connection: connectionOptions,
    concurrency: 2,
    autorun: true,
    lockDuration: 30000,
    stalledInterval: 30000,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Manifest Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Manifest Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
