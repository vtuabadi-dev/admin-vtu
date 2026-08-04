import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Inspecting database for dummy data...");

  const keberangkatans = await prisma.keberangkatan.findMany({
    select: { id: true, kode: true, namaPaket: true, _count: { select: { groups: true } } },
  });
  console.log("\n📦 Keberangkatan Packages count:", keberangkatans.length);
  keberangkatans.forEach((k) => console.log(`  - ID: ${k.id} | Kode: ${k.kode} | Nama: ${k.namaPaket} | Groups: ${k._count.groups}`));

  const groups = await prisma.registrationGroup.findMany({
    select: { id: true, kodeRegistrasi: true, _count: { select: { anggota: true } } },
  });
  console.log("\n👥 Registration Groups count:", groups.length);
  groups.forEach((g) => console.log(`  - ID: ${g.id} | KodeReg: ${g.kodeRegistrasi} | Anggota: ${g._count.anggota}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
