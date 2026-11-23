import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSequences() {
  const sequences = [
    'users_id_seq',
    'publishers_id_seq',
    'vouchers_id_seq',
    'products_id_seq',
    'orders_id_seq',
  ];
  for (const sequence of sequences) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${sequence}" RESTART WITH 1`);
  }
}

async function main() {
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await resetSequences();

  const an = await prisma.user.create({
    data: { name: 'An Nguyễn', email: 'an@shop.test' },
  });
  const binh = await prisma.user.create({
    data: { name: 'Bình Trần', email: 'binh@shop.test' },
  });
  const chi = await prisma.user.create({
    data: { name: 'Chi Lê', email: 'chi@shop.test' },
  });

  const publisherA = await prisma.publisher.create({ data: { userId: an.id } });
  const publisherB = await prisma.publisher.create({ data: { userId: binh.id } });

  await prisma.voucher.createMany({
    data: [
      { publisherId: publisherA.id, code: 'AN50', discountAmount: 50_000 },
      { publisherId: publisherB.id, code: 'BINH100', discountAmount: 100_000 },
      { publisherId: publisherB.id, code: 'BINH20', discountAmount: 20_000 },
    ],
  });

  await prisma.product.createMany({
    data: [
      { name: 'Tai nghe không dây', price: 1_000_000 },
      { name: 'Bàn phím cơ', price: 1_500_000 },
    ],
  });

  console.log('Seed xong.');
  console.log(`- Publisher An Nguyễn (#${publisherA.id}), voucher AN50 giảm 50.000`);
  console.log(`- Publisher Bình Trần (#${publisherB.id}), voucher BINH100 giảm 100.000 và BINH20 giảm 20.000`);
  console.log(`- Khách Chi Lê (#${chi.id}) không phải Publisher`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
