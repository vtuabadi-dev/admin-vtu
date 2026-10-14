import { prisma } from "@/server/db/client";
import { formatStandardDocumentFileName, hasPackageTourLeader } from "@/shared/lib/file-standardization";
import { moveAndRenameDriveFile, provisionPackageStorage } from "@/server/storage/google-drive";

export interface TransferPackageInput {
  groupId: string;
  targetPaketId: string;
  pricingOption: "HARGA_LAMA" | "HARGA_BARU";
  totalDiff?: number;
  hotelUpgrade?: {
    hotelName?: string;
    nominal?: number;
  };
  authorName?: string;
}

export interface TransferPackageResult {
  success: boolean;
  groupId: string;
  targetPaketId: string;
  pricingOption: "HARGA_LAMA" | "HARGA_BARU";
  totalAdditionalBill: number;
  invoice?: {
    id: string;
    nomorInvoice: string;
    jumlah: number;
  } | null;
  driveSyncStatus: {
    success: boolean;
    error?: string;
    movedCount?: number;
  };
}

/**
 * Domain Service: Transfer Registration Group between Departure Packages
 * WP-TRF-2026-001 (Governance Baseline EEOS v1.2)
 *
 * Implements:
 * 1. Mode HARGA_LAMA (preserves base price/obligations, no zero-dollar invoice)
 * 2. Mode HARGA_BARU (positive difference billed via unified InvoiceItem)
 * 3. BLOCKED: HARGA_BARU destination cheaper (strictly guarded awaiting PO financial policy)
 * 4. Explicit Hotel Upgrade (manual admin nominal, itemized InvoiceItem)
 * 5. Atomic PostgreSQL conditional update on keberangkatan capacity (anti-overbooking)
 * 6. Rooming old allocations cleanup (penghuni_kamar)
 * 7. Sequential and duplicate-safe target manifest row re-indexing
 * 8. Post-commit Google Drive relocation (isolated outside database transaction)
 */
export async function transferPackageGroup(
  input: TransferPackageInput
): Promise<TransferPackageResult> {
  if (!input.groupId || !input.targetPaketId) {
    throw new Error("groupId dan targetPaketId diperlukan");
  }

  if (input.pricingOption !== "HARGA_LAMA" && input.pricingOption !== "HARGA_BARU") {
    throw new Error("Mode harga tidak valid. Hanya mendukung 'HARGA_LAMA' atau 'HARGA_BARU'");
  }

  // 1. Fetch current group and target package
  const existingGroup = await prisma.registrationGroup.findUnique({
    where: { id: input.groupId },
    include: {
      keberangkatan: true,
      anggota: {
        where: { status: { not: "batal" as any } },
        include: { dokumen: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!existingGroup) {
    throw new Error("Grup pendaftaran tidak ditemukan");
  }

  // Idempotency check: Already in target package
  if (existingGroup.paketKeberangkatanId === input.targetPaketId) {
    throw new Error("Grup sudah terdaftar pada paket tujuan tersebut (idempoten)");
  }

  const targetPaket = await prisma.keberangkatan.findUnique({
    where: { id: input.targetPaketId },
  });

  if (!targetPaket) {
    throw new Error("Paket keberangkatan tujuan tidak ditemukan");
  }

  const activeMembers = existingGroup.anggota;
  const paxCount = activeMembers.length;
  if (paxCount === 0) {
    throw new Error("Tidak ada jamaah aktif dalam rombongan ini yang dapat dipindahkan");
  }

  // 2. Financial calculation and Scenario D check
  const oldBasePrice =
    existingGroup.keberangkatan?.hargaPaket ||
    (existingGroup.totalTagihan
      ? Math.round(existingGroup.totalTagihan / (existingGroup.jumlahAnggota || paxCount))
      : 0);
  const newBasePrice = targetPaket.hargaPaket;
  const diffPerPax = newBasePrice - oldBasePrice;
  const calculatedTotalDiff =
    input.totalDiff !== undefined ? input.totalDiff : diffPerPax * paxCount;

  // BLOCKING GUARD: HARGA_BARU when destination package is cheaper (Scenario D)
  if (input.pricingOption === "HARGA_BARU" && calculatedTotalDiff < 0) {
    throw new Error(
      "BLOCKED_FINANCIAL_DECISION: Penyesuaian tagihan untuk perpindahan ke paket dengan harga lebih murah (surplus/penurunan kewajiban) saat ini ditahan sementara menunggu ketetapan SOP akuntansi Product Owner."
    );
  }

  // 3. Execute in interactive database transaction
  const txResult = await prisma.$transaction(async (tx) => {
    // 0. Atomic Row Lock & Idempotency Guard on Registration Group (D-003)
    // Enforces concurrency isolation by acquiring row-level lock on the group
    // and verifying it has not already been moved to the target package.
    const updatedGroupRows = await tx.$executeRaw`
      UPDATE "registration_groups"
      SET "updatedAt" = NOW()
      WHERE "id" = ${existingGroup.id} AND "paketKeberangkatanId" != ${targetPaket.id}
    `;

    if (updatedGroupRows === 0) {
      throw new Error(
        "Grup sudah terdaftar pada paket tujuan tersebut atau sedang dipindahkan (idempoten)"
      );
    }

    // A. Atomic PostgreSQL Conditional Capacity Check & Increment
    const updatedTargetRows = await tx.$executeRaw`
      UPDATE "keberangkatan"
      SET "terisi" = "terisi" + ${paxCount}
      WHERE "id" = ${targetPaket.id} AND ("terisi" + ${paxCount}) <= "kuota"
    `;

    if (updatedTargetRows === 0) {
      const currentTarget = await tx.keberangkatan.findUnique({
        where: { id: targetPaket.id },
        select: { kuota: true, terisi: true },
      });
      const remaining = currentTarget
        ? Math.max(0, currentTarget.kuota - currentTarget.terisi)
        : 0;
      throw new Error(
        `CAPACITY_EXCEEDED: Kapasitas paket tujuan tidak mencukupi (Tersisa ${remaining} kursi, dibutuhkan ${paxCount} kursi).`
      );
    }

    // Decrement source package quota safely (guarded against negative)
    if (existingGroup.keberangkatan) {
      await tx.$executeRaw`
        UPDATE "keberangkatan"
        SET "terisi" = GREATEST(0, "terisi" - ${paxCount})
        WHERE "id" = ${existingGroup.keberangkatan.id}
      `;
    }

    // B. Clean up old room allocations for moving members (PenghuniKamar)
    const movingMemberIds = activeMembers.map((m) => m.id);
    await tx.penghuniKamar.deleteMany({
      where: { jamaahId: { in: movingMemberIds } },
    });

    // C. Re-link Manifest Rows to destination manifest sequentially (D-001)
    let targetManifest = await tx.manifest.findFirst({
      where: { keberangkatanId: targetPaket.id },
      orderBy: { createdAt: "desc" },
    });

    if (!targetManifest) {
      const d = new Date(targetPaket.tanggalBerangkat);
      const mStr = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const dStr = String(d.getDate()).padStart(2, "0");
      const yStr = d.getFullYear();
      targetManifest = await tx.manifest.create({
        data: {
          keberangkatanId: targetPaket.id,
          kode: `MAN/${yStr}/${mStr}${dStr}/001`,
          namaManifest: `MANIFEST UMRAH ${dStr} ${mStr} ${yStr}`,
          status: "draft",
        },
      });
    }

    const maxRow = await tx.manifestRow.findFirst({
      where: { manifestId: targetManifest.id },
      orderBy: { nomorUrut: "desc" },
      select: { nomorUrut: true },
    });
    let nextNomorUrut = (maxRow?.nomorUrut ?? 0) + 1;
    const memberManifestNumberMap: Record<string, number> = {};

    for (const member of activeMembers) {
      const assignedNomorUrut = nextNomorUrut++;
      memberManifestNumberMap[member.id] = assignedNomorUrut;

      const existingRow = await tx.manifestRow.findFirst({
        where: { jamaahId: member.id },
      });
      if (existingRow) {
        await tx.manifestRow.update({
          where: { id: existingRow.id },
          data: {
            manifestId: targetManifest.id,
            nomorUrut: assignedNomorUrut,
          },
        });
      } else {
        await tx.manifestRow.create({
          data: {
            manifestId: targetManifest.id,
            jamaahId: member.id,
            nomorUrut: assignedNomorUrut,
            namaLengkap: member.namaLengkap,
            nomorPaspor: member.nomorPaspor || "-",
            tempatLahir: member.tempatLahir || "-",
            tanggalLahir: member.tanggalLahir
              ? member.tanggalLahir.toISOString().slice(0, 10)
              : "-",
          },
        });
      }
    }

    // D. Financial Reconciliation & Invoice Generation
    let diffAmount = 0;
    if (input.pricingOption === "HARGA_BARU" && calculatedTotalDiff > 0) {
      diffAmount = calculatedTotalDiff;
    }

    let upgradeAmount = 0;
    if (input.hotelUpgrade?.nominal && input.hotelUpgrade.nominal > 0) {
      upgradeAmount = input.hotelUpgrade.nominal;
    }

    const totalAdditionalBill = diffAmount + upgradeAmount;
    let createdInvoice: any = null;

    if (totalAdditionalBill > 0) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = String(Math.floor(Math.random() * 9000) + 1000);
      const invNumber = `PINDAH-${existingGroup.kodeRegistrasi || existingGroup.id.slice(-6).toUpperCase()}-${dateStr}-${randomSuffix}`;

      createdInvoice = await tx.invoice.create({
        data: {
          id: invNumber,
          nomorInvoice: invNumber,
          groupId: existingGroup.id,
          tipe: "tambahan",
          jumlah: totalAdditionalBill,
          sisaTagihan: totalAdditionalBill,
          status: "unpaid",
          jatuhTempo: new Date(Date.now() + 14 * 86400000),
        },
      });

      if (diffAmount > 0) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: createdInvoice.id,
            kategori: "PINDAH_PAKET",
            deskripsi: `Selisih Pindah Paket ke ${targetPaket.namaPaket} (${paxCount} pax)`,
            qty: paxCount,
            hargaSatuan: Math.round(diffAmount / paxCount),
            jumlah: diffAmount,
            status: "active",
          },
        });
      }

      if (upgradeAmount > 0) {
        const hotelTitle = input.hotelUpgrade?.hotelName
          ? `: ${input.hotelUpgrade.hotelName}`
          : "";
        await tx.invoiceItem.create({
          data: {
            invoiceId: createdInvoice.id,
            kategori: "HOTEL_UPGRADE",
            deskripsi: `Upgrade Hotel${hotelTitle} (${paxCount} pax)`,
            qty: paxCount,
            hargaSatuan: Math.round(upgradeAmount / paxCount),
            jumlah: upgradeAmount,
            status: "active",
          },
        });
      }

      // Create pending payment in review queue
      await tx.pembayaran.create({
        data: {
          groupId: existingGroup.id,
          invoiceId: createdInvoice.id,
          jumlah: totalAdditionalBill,
          status: "pending",
          sumber: "admin",
          metode: "transfer",
          tanggal: new Date(),
          catatan: `Tagihan Pindah Paket / Upgrade (${invNumber})`,
        },
      });

      const newTotalTagihan = existingGroup.totalTagihan + totalAdditionalBill;
      const newSisa = Math.max(0, newTotalTagihan - existingGroup.totalPembayaran);

      await tx.registrationGroup.update({
        where: { id: existingGroup.id },
        data: {
          paketKeberangkatanId: targetPaket.id,
          totalTagihan: newTotalTagihan,
          sisaPembayaran: newSisa,
          updatedAt: new Date(),
        },
      });
    } else {
      // HARGA_LAMA without upgrade: Zero financial change
      await tx.registrationGroup.update({
        where: { id: existingGroup.id },
        data: {
          paketKeberangkatanId: targetPaket.id,
          updatedAt: new Date(),
        },
      });
    }

    // E. Record Audit Log ActivityEvent
    try {
      await tx.activityEvent.create({
        data: {
          keberangkatanId: targetPaket.id,
          type: "info",
          module: "manifest",
          message: `Rombongan ${existingGroup.namaGroup} (${paxCount} pax) dipindahkan dari paket ${existingGroup.keberangkatan?.namaPaket || existingGroup.paketKeberangkatanId} ke ${targetPaket.namaPaket} [Mode: ${input.pricingOption}${totalAdditionalBill > 0 ? `, Tambahan Tagihan: Rp ${totalAdditionalBill.toLocaleString("id-ID")}` : ", Tanpa Biaya Tambahan"}]`,
          triggeredBy: input.authorName || "Admin",
        },
      });
    } catch {
      /* non-blocking activity event */
    }

    return {
      createdInvoice,
      totalAdditionalBill,
      memberManifestNumberMap,
    };
  });

  // 4. Post-Commit Asynchronous Google Drive Relocation (Outside DB Transaction)
  let driveSyncStatus: { success: boolean; error?: string; movedCount?: number } = {
    success: true,
    movedCount: 0,
  };

  try {
    let targetFolders = (targetPaket.driveFolderIds as any) || {};
    if (
      !targetFolders.rootPackageFolderId ||
      targetFolders.rootPackageFolderId === "local-mock"
    ) {
      try {
        const prov = await provisionPackageStorage(targetPaket.id);
        if (prov) targetFolders = prov;
      } catch (provErr) {
        console.warn("[Cloud Vault] Provision target package notice:", provErr);
      }
    }

    const hasTL = hasPackageTourLeader(targetPaket);
    const offset = hasTL ? 2 : 1;
    const oldFolders = (existingGroup.keberangkatan?.driveFolderIds as any) || {};

    let fallbackManifestNo = offset;
    let movedCount = 0;

    for (const member of activeMembers) {
      // D-001: Use actual assigned manifest row number from DB transaction
      const noUrutBaru =
        txResult.memberManifestNumberMap?.[member.id] ?? fallbackManifestNo++;
      const regCode =
        member.registrationId || existingGroup.kodeRegistrasi || member.id;

      for (const dok of member.dokumen) {
        if (!dok.fileUrl) continue;

        let oldTargetFolder: string | undefined;
        let newTargetFolder: string | undefined;
        if (dok.jenis === "paspor") {
          oldTargetFolder = oldFolders.paspor;
          newTargetFolder = targetFolders.paspor;
        } else if (dok.jenis === "pas_foto") {
          oldTargetFolder = oldFolders.foto;
          newTargetFolder = targetFolders.foto;
        } else if (dok.jenis === "ktp") {
          oldTargetFolder = oldFolders.ktp;
          newTargetFolder = targetFolders.ktp;
        } else {
          oldTargetFolder = oldFolders.dokumenLain;
          newTargetFolder = targetFolders.dokumenLain;
        }

        let ext = "jpg";
        const extMatch = dok.fileUrl.match(/\.([a-zA-Z0-9]{3,4})(?:[?#]|$)/i);
        if (extMatch && extMatch[1]) ext = extMatch[1];

        const newFileName = formatStandardDocumentFileName(
          noUrutBaru,
          regCode,
          member.namaLengkap,
          ext
        );

        moveAndRenameDriveFile(
          dok.fileUrl,
          newTargetFolder,
          oldTargetFolder,
          newFileName
        ).catch((err) => {
          console.warn(`[Google Drive Move Warning] Doc ID ${dok.id}:`, err);
        });
        movedCount++;
      }
    }

    driveSyncStatus.movedCount = movedCount;
  } catch (driveErr: any) {
    console.warn("[Google Drive Post-Commit Notice]:", driveErr?.message || driveErr);
    driveSyncStatus = {
      success: false,
      error: driveErr?.message || "Google Drive file relocation notice",
    };
  }

  return {
    success: true,
    groupId: existingGroup.id,
    targetPaketId: targetPaket.id,
    pricingOption: input.pricingOption,
    totalAdditionalBill: txResult.totalAdditionalBill,
    invoice: txResult.createdInvoice
      ? {
          id: txResult.createdInvoice.id,
          nomorInvoice: txResult.createdInvoice.nomorInvoice,
          jumlah: txResult.createdInvoice.jumlah,
        }
      : null,
    driveSyncStatus,
  };
}
