import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting Complete Dummy Data Cleanup...");

  // 1. Rooming & Kamar
  console.log("🗑️ Deleting Rooming & Kamar...");
  await prisma.penghuniKamar.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.kamar.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.rooming.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 2. Manifest
  console.log("🗑️ Deleting Manifests...");
  await prisma.manifestRow.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.manifest.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { kode: { contains: "DUMMY" } }] } });

  // 3. Dokumen Items
  console.log("🗑️ Deleting Dokumen Items...");
  await prisma.dokumenItem.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 4. Pembayaran & Invoices
  console.log("🗑️ Deleting Pembayaran & Invoices...");
  await prisma.alokasiPembayaran.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.pembayaran.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.invoiceItem.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.invoice.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { nomorInvoice: { contains: "DUMMY" } }] } });

  // 5. Unlink ketuaGroupId from Registration Groups via raw SQL
  console.log("🔓 Unlinking ketuaGroupId on Dummy Registration Groups...");
  await prisma.$executeRawUnsafe(`UPDATE "registration_groups" SET "ketuaGroupId" = '' WHERE "id" LIKE 'DUMMY-%' OR "id" LIKE '%dummy%' OR "kodeRegistrasi" LIKE '%DUMMY%';`);

  // 6. Delete Jamaah
  console.log("🗑️ Deleting Jamaah...");
  await prisma.jamaah.deleteMany({
    where: { OR: [{ id: { startsWith: "DUMMY-" } }, { namaLengkap: { contains: "[DUMMY]" } }] },
  });

  // 7. Delete Registration Groups
  console.log("🗑️ Deleting Registration Groups...");
  await prisma.registrationGroup.deleteMany({
    where: { OR: [{ id: { startsWith: "DUMMY-" } }, { kodeRegistrasi: { contains: "DUMMY" } }] },
  });

  // 8. Delete Keberangkatan & PaketGrup
  console.log("🗑️ Deleting Keberangkatan & PaketGrup...");
  await prisma.keberangkatan.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "DUMMY-" } },
        { kode: { contains: "DUMMY" } },
        { namaPaket: { contains: "DUMMY" } },
        { namaPaket: { contains: "[DUMMY]" } },
      ],
    },
  });
  await prisma.paketGrup.deleteMany({
    where: { OR: [{ id: { startsWith: "DUMMY-" } }, { kodeGrup: { contains: "DUMMY" } }] },
  });

  // 9. Badal Umroh & Wakaf Quran
  console.log("🗑️ Deleting Badal Umroh & Wakaf Quran...");
  await prisma.badalUmrohRegistration.deleteMany({
    where: { id: { startsWith: "DUMMY-" } },
  });
  await prisma.wakafQuranRegistration.deleteMany({
    where: { id: { startsWith: "DUMMY-" } },
  });

  // 10. Master Data Dummy
  console.log("🗑️ Deleting Master Data Dummy...");
  await prisma.masterAirline.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { name: { contains: "[DUMMY]" } }] } });
  await prisma.masterHotel.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { name: { contains: "[DUMMY]" } }] } });
  await prisma.masterHotelCity.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterCity.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { name: { contains: "[DUMMY]" } }] } });
  await prisma.masterPackageType.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { name: { contains: "[DUMMY]" } }] } });
  await prisma.masterRoute.deleteMany({ where: { OR: [{ id: { startsWith: "DUMMY-" } }, { kode: { contains: "DUMMY" } }] } });

  console.log("\n✨ CLEANUP COMPLETE: All Dummy Test Data has been deleted successfully!");
  console.log("🔒 Real production and user-generated packages were left completely untouched.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error cleaning dummy data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
