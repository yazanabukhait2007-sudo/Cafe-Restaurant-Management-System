import { prisma } from "../server/lib/prisma.ts";

async function main() {
  console.log("Re-linking permissions to roles...");

  const permissionNames = [
    "orders:create", "orders:view", "orders:edit", "orders:delete",
    "inventory:view", "inventory:manage",
    "employees:view", "employees:manage",
    "reports:view",
    "settings:manage",
    "tables:manage",
    "billing:process",
    "menu:manage",
    "inventory:count:create",
    "inventory:count:edit",
    "inventory:count:commit",
    "inventory:count:cancel",
  ];

  // Upsert all permissions first just in case
  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const roleDefinitions = [
    { name: "Owner", perms: permissionNames },
    { name: "Manager", perms: [
      "orders:view", "orders:edit", "inventory:view", "employees:view", "reports:view", "tables:manage", "menu:manage",
      "inventory:count:create", "inventory:count:edit", "inventory:count:commit", "inventory:count:cancel"
    ] },
    { name: "Cashier", perms: ["orders:create", "orders:view", "billing:process"] },
    { name: "Waiter", perms: ["orders:create", "orders:view", "tables:manage"] },
    { name: "Kitchen", perms: ["orders:view"] },
    { name: "Bar", perms: ["orders:view"] },
    { name: "Accountant", perms: ["reports:view"] },
  ];

  for (const r of roleDefinitions) {
    const dbRole = await prisma.role.findUnique({
      where: { name: r.name },
    });

    if (dbRole) {
      console.log(`Linking permissions for role: ${r.name}`);
      await prisma.role.update({
        where: { id: dbRole.id },
        data: {
          permissions: {
            set: [], // Clear any existing
            connect: r.perms.map((p) => ({ name: p })),
          },
        },
      });
    } else {
      console.log(`Role ${r.name} not found in database, creating...`);
      await prisma.role.create({
        data: {
          name: r.name,
          permissions: {
            connect: r.perms.map((p) => ({ name: p })),
          },
        },
      });
    }
  }

  console.log("Permissions successfully linked to roles!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
