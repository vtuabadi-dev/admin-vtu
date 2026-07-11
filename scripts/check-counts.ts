import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Users:', await prisma.user.count());
  console.log('Jamaah:', await prisma.jamaah.count());
  console.log('Keberangkatan:', await prisma.keberangkatan.count());
  console.log('Groups:', await prisma.registrationGroup.count());
  console.log('Invoices:', await prisma.invoice.count());
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
