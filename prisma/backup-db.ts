import { prisma } from "../server/lib/prisma.ts";
import * as fs from "fs";
import * as path from "path";

async function backup() {
  const backupData: Record<string, any[]> = {};

  // List of all models in schema.prisma in topological dependency order
  const models = [
    "permission",
    "role",
    "user",
    "employee",
    "attendance",
    "shift",
    "table",
    "reservation",
    "coupon",
    "cashierSession",
    "order",
    "category",
    "product",
    "productVariant",
    "modifierGroup",
    "productModifierGroup",
    "modifier",
    "recipe",
    "recipeIngredient",
    "recipeStep",
    "ingredient",
    "productIngredient",
    "inventoryTransaction",
    "payment",
    "orderItem",
    "orderItemModifier",
    "activityLog",
    "notification",
    "setting",
    "session",
    "orderStatusHistory"
  ];

  console.log("Starting SQLite database backup...");
  for (const model of models) {
    try {
      const client = (prisma as any)[model];
      if (client) {
        const records = await client.findMany();
        backupData[model] = records;
        console.log(`Backed up ${records.length} records for ${model}`);
      } else {
        console.warn(`Model ${model} not found in prisma client`);
      }
    } catch (e: any) {
      console.error(`Error backing up model ${model}:`, e.message);
    }
  }

  const outputPath = path.join(process.cwd(), "prisma", "backup.json");
  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), "utf-8");
  console.log(`\n🎉 Backup completed successfully! Saved to: ${outputPath}`);
}

backup()
  .catch((e) => {
    console.error("Backup failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
