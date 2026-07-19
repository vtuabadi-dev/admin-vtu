const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const hotels = await prisma.masterHotel.findMany({
    include: {
      keberangkatanMekkah: true,
      keberangkatanMadinah: true,
    }
  });

  console.log("=== DETAIL RUJUKAN HOTEL ===");
  for (const h of hotels) {
    console.log(`\nHotel: ${h.name} (${h.code})`);
    
    const countMekkah = h.keberangkatanMekkah.length;
    const countMadinah = h.keberangkatanMadinah.length;
    
    if (countMekkah > 0) {
      console.log(`- Dirujuk sebagai Hotel Mekkah oleh ${countMekkah} Keberangkatan:`);
      h.keberangkatanMekkah.forEach(k => console.log(`  * Keberangkatan: ${k.namaPaket} (${k.kode})`));
    }
    
    if (countMadinah > 0) {
      console.log(`- Dirujuk sebagai Hotel Madinah oleh ${countMadinah} Keberangkatan:`);
      h.keberangkatanMadinah.forEach(k => console.log(`  * Keberangkatan: ${k.namaPaket} (${k.kode})`));
    }
    
    if (countMekkah === 0 && countMadinah === 0) {
      console.log(`- Dirujuk oleh 0 Keberangkatan`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
