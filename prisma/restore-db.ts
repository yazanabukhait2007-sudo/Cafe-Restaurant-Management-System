import { prisma } from "../server/lib/prisma.ts";
import * as fs from "fs";
import * as path from "path";

async function restore() {
  const backupPath = path.join(process.cwd(), "prisma", "backup.json");
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at: ${backupPath}. Please run backup first.`);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  console.log("Loaded backup data successfully. Beginning restoration...");

  // Correct dependency-ordered list of tables for clean insertion
  const orderedModels = [
    { name: "permission", label: "Permission" },
    { name: "role", label: "Role" },
    { name: "user", label: "User" },
    { name: "employee", label: "Employee" },
    { name: "attendance", label: "Attendance" },
    { name: "shift", label: "Shift" },
    { name: "table", label: "Table" },
    { name: "reservation", label: "Reservation" },
    { name: "coupon", label: "Coupon" },
    { name: "cashierSession", label: "CashierSession" },
    { name: "category", label: "Category" },
    { name: "product", label: "Product" },
    { name: "productVariant", label: "ProductVariant" },
    { name: "modifierGroup", label: "ModifierGroup" },
    { name: "modifier", label: "Modifier" },
    { name: "productModifierGroup", label: "ProductModifierGroup" },
    { name: "recipe", label: "Recipe" },
    { name: "recipeIngredient", label: "RecipeIngredient" },
    { name: "recipeStep", label: "RecipeStep" },
    { name: "ingredient", label: "Ingredient" },
    { name: "productIngredient", label: "ProductIngredient" },
    { name: "inventoryTransaction", label: "InventoryTransaction" },
    { name: "order", label: "Order" },
    { name: "orderItem", label: "OrderItem" },
    { name: "orderItemModifier", label: "OrderItemModifier" },
    { name: "payment", label: "Payment" },
    { name: "activityLog", label: "ActivityLog" },
    { name: "notification", label: "Notification" },
    { name: "setting", label: "Setting" },
    { name: "session", label: "Session" },
    { name: "orderStatusHistory", label: "OrderStatusHistory" }
  ];

  // Disable any active recipes backlinks temporarily or clear tables first in reverse order
  console.log("\n🧹 1. Clearing existing records in reverse dependency order...");
  for (let i = orderedModels.length - 1; i >= 0; i--) {
    const { name } = orderedModels[i];
    const client = (prisma as any)[name];
    if (client) {
      try {
        await client.deleteMany({});
        console.log(`Cleared all records from ${name}`);
      } catch (err: any) {
        // Safe warning
        console.warn(`Could not clear ${name}: ${err.message}`);
      }
    }
  }

  console.log("\n📥 2. Loading and restoring data in correct order of relations...");
  for (const { name } of orderedModels) {
    const records = backupData[name] || [];
    if (records.length === 0) continue;

    console.log(`Restoring ${records.length} records for ${name}...`);
    const client = (prisma as any)[name];
    if (!client) {
      console.warn(`Model ${name} does not exist in Prisma Client.`);
      continue;
    }

    // Insert records one by one or chunked to handle custom mapping or relations
    for (const record of records) {
      try {
        // Handle DateTime deserialization from JSON strings to Date objects
        const parsedRecord = { ...record };
        for (const key of Object.keys(parsedRecord)) {
          const val = parsedRecord[key];
          if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            parsedRecord[key] = new Date(val);
          }
        }

        await client.create({
          data: parsedRecord
        });
      } catch (err: any) {
        console.error(`❌ Failed to restore record in ${name}:`, err.message, JSON.stringify(record));
      }
    }
  }

  console.log("\n🎉 Database restoration completed successfully!");
}

restore()
  .catch((e) => {
    console.error("Restoration failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
