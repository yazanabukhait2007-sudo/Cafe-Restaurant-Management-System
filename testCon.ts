import { prisma } from "./server/lib/prisma.ts";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    const products = await prisma.product.findMany({
      include: { variants: true }
    });
    console.log("Current Database Products:", products.map(p => ({ id: p.id, name: p.name, variants: p.variants.map(v => v.name) })));
  } catch (err) {
    console.error("Database query failed:", err);
  }
}
run();

