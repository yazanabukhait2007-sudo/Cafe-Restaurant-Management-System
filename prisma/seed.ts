import { prisma } from "../server/lib/prisma.ts";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // 1. Create permissions
  const permissionNames = [
    "orders:create", "orders:view", "orders:edit", "orders:delete",
    "inventory:view", "inventory:manage",
    "employees:view", "employees:manage",
    "reports:view",
    "settings:manage",
    "tables:manage",
    "billing:process",
  ];

  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log(`Created ${permissions.length} permissions.`);

  // 2. Create roles
  const roles = [
    { name: "Owner", perms: permissionNames },
    { name: "Manager", perms: ["orders:view", "orders:edit", "inventory:view", "employees:view", "reports:view", "tables:manage"] },
    { name: "Cashier", perms: ["orders:create", "orders:view", "billing:process"] },
    { name: "Waiter", perms: ["orders:create", "orders:view", "tables:manage"] },
    { name: "Kitchen", perms: ["orders:view"] },
    { name: "Bar", perms: ["orders:view"] },
    { name: "Accountant", perms: ["reports:view"] },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: {
        name: r.name,
        permissions: {
          connect: r.perms.map((p) => ({ name: p })),
        },
      },
    });
  }

  console.log(`Created ${roles.length} roles.`);

  // 3. Create initial Owner user
  const adminPassword = await bcrypt.hash("Admin12@", 10);
  const ownerRole = await prisma.role.findUnique({ where: { name: "Owner" } });

  if (ownerRole) {
    await prisma.user.upsert({
      where: { email: "admin@cafe.com" },
      update: { password: adminPassword },
      create: {
        email: "admin@cafe.com",
        password: adminPassword,
        name: "Cafe Owner",
        roleId: ownerRole.id,
      },
    });
    console.log("Created initial Owner: admin@cafe.com / Admin12@");
  }

  // 4. Create sample tables
  const tables = [
    { number: "01", capacity: 2 },
    { number: "02", capacity: 2 },
    { number: "03", capacity: 4 },
    { number: "04", capacity: 4 },
    { number: "05", capacity: 6 },
    { number: "06", capacity: 8 },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { number: t.number },
      update: { capacity: t.capacity },
      create: t,
    });
  }
  console.log(`Created ${tables.length} tables.`);

  // 5. Create sample Menu
  const categoryNames = ["Coffee", "Bakery", "Breakfast", "Desserts"];
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    if (name === "Coffee") {
      await prisma.product.upsert({
        where: { id: "p-latte" },
        update: {},
        create: {
          id: "p-latte",
          categoryId: cat.id,
          name: "Signature Latte",
          description: "Rich espresso with steamed velvety milk",
          price: 4.5,
          variants: {
            create: [
              { name: "Regular", price: 4.5 },
              { name: "Large", price: 5.5 },
              { name: "Extra Shot", price: 6.0 },
            ],
          },
        },
      });
      await prisma.product.upsert({
        where: { id: "p-espresso" },
        update: {},
        create: {
          id: "p-espresso",
          categoryId: cat.id,
          name: "Double Espresso",
          description: "Pure and intense",
          price: 3.0,
        },
      });
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
