import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { validate } from "../middleware/validate.ts";
import { createCategorySchema, createProductSchema } from "../validation/schemas.ts";

const router = express.Router();


// Public QR Menu (View-only for now)
router.get("/public", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          where: { isAvailable: true },
          include: { variants: true },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu" });
  }
});

// Manage Categories (Owner, Manager)
router.post("/categories", authenticate, authorize(["inventory:manage"]), validate({ body: createCategorySchema }), async (req, res) => {
  const { name, image } = req.body;
  try {
    const category = await prisma.category.create({ data: { name, image } });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to create category" });
  }
});

// Manage Products (Owner, Manager)
router.post("/products", authenticate, authorize(["inventory:manage"]), validate({ body: createProductSchema }), async (req, res) => {
  const { categoryId, name, description, price, image, variants } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        variants: {
          create: variants,
        },
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to create product" });
  }
});

export default router;
