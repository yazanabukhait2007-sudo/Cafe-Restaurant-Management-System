import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { validateAndDeductStock, checkStockAvailability, revertOrderStock, adjustOrderStock } from "../lib/inventoryEngine.ts";

const router = express.Router();

/**
 * GET /api/inventory/ingredients
 * Fetch list of all ingredients
 */
router.get("/ingredients", authenticate, async (req, res) => {
  try {
    const list = await prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { recipeItems: true }
        }
      }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch ingredients", error: error.message });
  }
});

/**
 * POST /api/inventory/ingredients
 * Add a new ingredient
 */
router.post("/ingredients", authenticate, authorize(["inventory:manage"]), async (req, res) => {
  try {
    const { name, unit, currentStock, lowStockLevel, cost, supplier } = req.body;
    
    if (!name || !unit) {
      return res.status(400).json({ message: "Name and unit are required fields" });
    }

    const exists = await prisma.ingredient.findUnique({ where: { name } });
    if (exists) {
      return res.status(400).json({ message: "مكون بنفس الاسم موجود بالفعل في النظام" });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        currentStock: currentStock !== undefined ? parseFloat(currentStock) : 0,
        lowStockLevel: lowStockLevel !== undefined ? parseFloat(lowStockLevel) : 10,
        cost: cost !== undefined ? parseFloat(cost) : 0,
        supplier: supplier || null,
      }
    });

    // Log addition transaction if initial stock > 0
    if (ingredient.currentStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          ingredientId: ingredient.id,
          type: "Purchase",
          quantity: ingredient.currentStock,
          beforeQty: 0,
          afterQty: ingredient.currentStock,
          note: "رصيد افتتاح المكون عند الإنشاء",
          userId: (req as any).user?.id || null,
        }
      });
    }

    res.status(201).json(ingredient);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create ingredient", error: error.message });
  }
});

/**
 * PUT /api/inventory/ingredients/:id
 * Edit an ingredient, handles manual stock adjustment
 */
router.put("/ingredients/:id", authenticate, authorize(["inventory:manage"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, currentStock, lowStockLevel, cost, supplier, adjustmentReason } = req.body;

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    const originalStock = existing.currentStock;
    const newStock = currentStock !== undefined ? parseFloat(currentStock) : originalStock;

    // Check if name is unique when being updated
    if (name && name !== existing.name) {
      const duplicate = await prisma.ingredient.findUnique({ where: { name } });
      if (duplicate) {
        return res.status(400).json({ message: "الاسم الجديد مستخدم بالفعل لمكون آخر" });
      }
    }

    if (newStock < 0) {
      return res.status(400).json({ message: "لا يمكن أن تكون كمية المخزون أقل من صفر" });
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: {
        name: name || existing.name,
        unit: unit || existing.unit,
        currentStock: newStock,
        lowStockLevel: lowStockLevel !== undefined ? parseFloat(lowStockLevel) : existing.lowStockLevel,
        cost: cost !== undefined ? parseFloat(cost) : existing.cost,
        supplier: supplier !== undefined ? supplier : existing.supplier,
      }
    });

    // If stock changed, log an Adjustment or Purchase transaction
    if (newStock !== originalStock) {
      const delta = newStock - originalStock;
      await prisma.inventoryTransaction.create({
        data: {
          ingredientId: id,
          type: delta > 0 ? "Adjustment" : "Wastage",
          quantity: delta,
          beforeQty: originalStock,
          afterQty: newStock,
          note: adjustmentReason || "تعديل يدوي للكمية من لوحة التحكم للمدير",
          userId: (req as any).user?.id || null,
        }
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update ingredient", error: error.message });
  }
});

/**
 * DELETE /api/inventory/ingredients/:id
 */
router.delete("/ingredients/:id", authenticate, authorize(["inventory:manage"]), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    await prisma.ingredient.delete({ where: { id } });
    res.json({ message: "Successfully deleted ingredient" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete ingredient", error: error.message });
  }
});

/**
 * GET /api/inventory/recipes
 * Gets menu items, and their recipe rules configuration
 */
router.get("/recipes", authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            recipeItems: {
              include: { ingredient: true }
            }
          }
        },
        recipeItems: {
          include: { ingredient: true }
        }
      },
      orderBy: { name: "asc" }
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch recipes", error: error.message });
  }
});

/**
 * POST /api/inventory/recipes
 * Save recipe ingredients for a Product and optional ProductVariant
 */
router.post("/recipes", authenticate, authorize(["inventory:manage"]), async (req, res) => {
  try {
    const { productId, productVariantId, ingredients } = req.body; // ingredients: [{ ingredientId, quantity }]

    if (!productId || !Array.isArray(ingredients)) {
      return res.status(400).json({ message: "productId and ingredients array are required" });
    }

    // Wrap in a atomic transaction
    await prisma.$transaction(async (tx) => {
      // Clear old recipe matching this configuration
      await tx.productIngredient.deleteMany({
        where: {
          productId,
          productVariantId: productVariantId || null,
        }
      });

      // Insert new recipe items
      for (const reqIng of ingredients) {
        if (!reqIng.ingredientId || reqIng.quantity <= 0) continue;
        await tx.productIngredient.create({
          data: {
            productId,
            productVariantId: productVariantId || null,
            ingredientId: reqIng.ingredientId,
            quantity: parseFloat(reqIng.quantity),
          }
        });
      }
    });

    res.json({ success: true, message: "تم حفظ وصفة المنتج والمكونات بنجاح" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save recipe", error: error.message });
  }
});

/**
 * GET /api/inventory/transactions
 * Retrieve transaction history logs
 */
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const { type, ingredientId, limit = "50" } = req.query;
    
    const filter: any = {};
    if (type) filter.type = String(type);
    if (ingredientId) filter.ingredientId = String(ingredientId);

    const logs = await prisma.inventoryTransaction.findMany({
      where: filter,
      include: {
        ingredient: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(String(limit), 10) || 50
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch transaction logs", error: error.message });
  }
});

/**
 * POST /api/inventory/adjust
 * Atomically adjust stock level upwards or downwards manually
 */
router.post("/adjust", authenticate, authorize(["inventory:manage"]), async (req, res) => {
  try {
    const { ingredientId, quantity, type, note } = req.body; // quantity can be positive (Addition) or negative (Wastage / Adjustment)

    if (!ingredientId || quantity === undefined) {
      return res.status(400).json({ message: "ingredientId and quantity are required" });
    }

    const delta = parseFloat(quantity);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ message: "Invalid quantity delta" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const dbIng = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (!dbIng) {
        throw new Error("المكون غير متواجد في قاعدة البيانات");
      }

      const beforeQty = dbIng.currentStock;
      const afterQty = beforeQty + delta;

      if (afterQty < 0) {
        throw new Error("الكمية الناتجة في المخزن لا يمكن أن تكون سالبة");
      }

      const updated = await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: afterQty }
      });

      // Update any active inventory count sessions if this is an "Adjustment" type
      if (type === "Adjustment") {
        const activeSession = await tx.inventoryCountSession.findFirst({
          where: {
            status: {
              in: ["Draft", "InProgress"]
            }
          },
          include: {
            items: true
          }
        });

        if (activeSession) {
          const matchingItem = activeSession.items.find(it => it.ingredientId === ingredientId);
          if (matchingItem) {
            const cost = dbIng.cost || 0;
            const difference = afterQty - matchingItem.expectedStock;
            const differenceValue = difference * cost;

            await tx.inventoryCountItem.update({
              where: { id: matchingItem.id },
              data: {
                actualStock: afterQty,
                difference: parseFloat(difference.toFixed(4)),
                differenceValue: parseFloat(differenceValue.toFixed(4)),
                reason: note || "تسوية جرد دوري",
                notes: "تم تسجيلها تلقائياً من صفحة تحديثات المستودع"
              }
            });

            // Also update session status to InProgress if it was Draft
            if (activeSession.status === "Draft") {
              await tx.inventoryCountSession.update({
                where: { id: activeSession.id },
                data: { status: "InProgress" }
              });
            }
          }
        }
      }

      await tx.inventoryTransaction.create({
        data: {
          ingredientId,
          type: type || (delta > 0 ? "Purchase" : "Wastage"),
          quantity: delta,
          beforeQty,
          afterQty,
          note: note || `تعديل يدوي من لوحة تحكم المدير`,
          userId: (req as any).user?.id || null,
        }
      });

      return updated;
    });

    res.json({ success: true, updated: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/inventory/check-stock
 * Validates stock before checkout/ordering
 */
router.post("/check-stock", authenticate, async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, productVariantId, quantity, name }

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, message: "No items to validate" });
    }

    const stockCheck = await checkStockAvailability(items);
    res.json(stockCheck);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to run check-stock verification", error: error.message });
  }
});

/**
 * POST /api/inventory/deduct
 * Deduct stock via explicit action
 */
router.post("/deduct", authenticate, async (req, res) => {
  try {
    const { orderId, items } = req.body;
    
    if (!orderId || !Array.isArray(items)) {
      return res.status(400).json({ message: "orderId and items are required" });
    }

    const result = await validateAndDeductStock(orderId, items, (req as any).user?.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
