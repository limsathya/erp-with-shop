import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@erp.local" },
    update: {},
    create: { name: "Admin", email: "admin@erp.local", password, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "staff@erp.local" },
    update: {},
    create: { name: "Staff", email: "staff@erp.local", password, role: "STAFF" },
  });

  const beverages = await prisma.category.upsert({
    where: { name: "Beverages" },
    update: {},
    create: { name: "Beverages" },
  });
  const equipment = await prisma.category.upsert({
    where: { name: "Equipment" },
    update: {},
    create: { name: "Equipment" },
  });

  const products = [
    { sku: "COF-ETH-250", name: "Ethiopia Yirgacheffe 250g", nameKm: "កាហ្វេអេត្យូពី ២៥០ក្រាម", nameZh: "埃塞俄比亚耶加雪菲 250克", price: 19, cost: 9, stock: 40, categoryId: beverages.id },
    { sku: "COF-COL-250", name: "Colombia Huila 250g", nameKm: "កាហ្វេកូឡុំប៊ី ២៥០ក្រាម", nameZh: "哥伦比亚惠兰 250克", price: 17, cost: 8, stock: 35, categoryId: beverages.id },
    { sku: "COF-HOUSE-250", name: "House Blend 250g", nameKm: "កាហ្វេផ្សំ ២៥០ក្រាម", nameZh: "招牌拼配 250克", price: 15, cost: 7, stock: 4, categoryId: beverages.id },
    { sku: "EQ-GRINDER", name: "Conical Burr Grinder", nameKm: "ម៉ាស៊ីនកិនកាហ្វេ", nameZh: "锥形磨豆机", price: 89, cost: 55, stock: 6, categoryId: equipment.id },
    { sku: "EQ-CARAFE", name: "Pour-Over Carafe", nameKm: "ប្រដាប់ច្រោះកាហ្វេ", nameZh: "手冲咖啡壶", price: 34, cost: 18, stock: 22, categoryId: equipment.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        ...p,
        movements: { create: { type: "IN", quantity: p.stock, note: "Seed stock" } },
      },
    });
  }

  await prisma.customer.createMany({
    data: [
      { name: "Sok Dara", phone: "+855 12 345 678", email: "dara@example.com", address: "Phnom Penh" },
      { name: "Lim Mei", phone: "+855 96 111 222", email: "mei@example.com", address: "Siem Reap" },
    ],
    skipDuplicates: true,
  });

  await prisma.supplier.createMany({
    data: [
      { name: "Mekong Coffee Importers", phone: "+855 23 900 100", email: "sales@mekongcoffee.kh" },
      { name: "Angkor Equipment Co.", phone: "+855 23 700 200", email: "info@angkoreq.kh" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed complete.");
  console.log("   Admin login → admin@erp.local / admin1234");
  console.log("   Staff login → staff@erp.local / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
