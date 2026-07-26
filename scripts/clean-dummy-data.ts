import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting Dummy Data Cleanup for VTU Operational System...");

  // 1. Rooming & Kamar
  console.log("🗑️ Deleting Dummy Rooming & Kamar...");
  await prisma.penghuniKamar.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.kamar.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.rooming.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 2. Manifest
  console.log("🗑️ Deleting Dummy Manifests...");
  await prisma.manifestRow.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.manifest.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 3. Dokumen Items
  console.log("🗑️ Deleting Dummy Dokumen Items...");
  await prisma.dokumenItem.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 4. Pembayaran & Invoices
  console.log("🗑️ Deleting Dummy Pembayaran & Invoices...");
  await prisma.pembayaran.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.invoiceItem.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.invoice.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 5. Jamaah & Groups
  console.log("🗑️ Deleting Dummy Jamaah & Groups...");
  await prisma.jamaah.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.registrationGroup.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 6. Keberangkatan (Departure Packages)
  console.log("🗑️ Deleting Dummy Keberangkatan...");
  await prisma.keberangkatan.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 7. Badal Umroh & Wakaf Quran
  console.log("🗑️ Deleting Dummy Badal Umroh & Wakaf Quran...");
  await prisma.badalUmrohRegistration.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.wakafQuranRegistration.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  // 8. Master Data Dummy
  console.log("🗑️ Deleting Dummy Master Data...");
  await prisma.masterAirline.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterHotel.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterHotelCity.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterCity.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterPackageType.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });
  await prisma.masterRoute.deleteMany({ where: { id: { startsWith: "DUMMY-" } } });

  console.log("\n✨ CLEANUP COMPLETE: All Dummy Test Data has been deleted successfully!");
  console.log("🔒 Real production and master data were left completely untouched.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error cleaning dummy data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
