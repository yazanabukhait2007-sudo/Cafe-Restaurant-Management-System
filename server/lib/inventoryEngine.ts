import { prisma } from "./prisma.ts";

/**
 * Interface to describe items for stock checking/deduction
 */
export interface InventoryOrderItem {
  productId: string;
  productVariantId?: string | null;
  modifierIds?: string[];
  name: string;
  quantity: number;
}

/**
 * Result structure of inventory operations
 */
export interface InventoryResult {
  success: boolean;
  message: string;
  lowStockAlerts?: string[];
  insufficientItem?: string | null;
}

/**
 * Fetches the ingredients required for a set of order items,
 * calculating the total required quantities per ingredient.
 * Supports Recursive Recipes (Semi-finished) and Modifiers.
 */
export async function getRequiredIngredients(items: InventoryOrderItem[], tx = prisma) {
  const result: {
    [ingredientId: string]: {
      ingredient: any;
      requiredQty: number;
    };
  } = {};

  // Recursive explorer for recipes to handle sub-recipes (Semi-finished)
  const explodeRecipe = async (recipeId: string, multiplier: number) => {
    const recipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        }
      }
    });

    if (!recipe) return;

    for (const ri of recipe.ingredients) {
      const totalNeeded = ri.quantity * multiplier;
      
      // If the ingredient itself is a semi-finished product with a recipe, explode it recursively
      if (ri.ingredient.isSemiFinished && ri.ingredient.recipeId) {
        await explodeRecipe(ri.ingredient.recipeId, totalNeeded);
      } else {
        // Base case: collect ingredient requirements
        if (!result[ri.ingredientId]) {
          result[ri.ingredientId] = {
            ingredient: ri.ingredient,
            requiredQty: 0
          };
        }
        result[ri.ingredientId].requiredQty += totalNeeded;
      }
    }
  };

  for (const item of items) {
    // 1. Resolve Product/Variant Recipe
    const product = await tx.product.findUnique({
      where: { id: String(item.productId) },
      include: {
        activeRecipe: true,
        variants: {
          where: { id: item.productVariantId || undefined },
          include: { activeRecipe: true }
        }
      }
    });

    if (product) {
      let targetRecipeId: string | null = null;
      
      if (item.productVariantId) {
        const variant = product.variants.find(v => v.id === item.productVariantId);
        if (variant?.activeRecipeId) {
          targetRecipeId = variant.activeRecipeId;
        }
      }
      
      if (!targetRecipeId && product.activeRecipeId) {
        targetRecipeId = product.activeRecipeId;
      }

      if (targetRecipeId) {
        await explodeRecipe(targetRecipeId, item.quantity);
      }
    }

    // 2. Resolve Multiplier/Modifier Recipes
    if (item.modifierIds && item.modifierIds.length > 0) {
      const dbModifiers = await tx.modifier.findMany({
        where: { id: { in: item.modifierIds } },
        include: { activeRecipe: true }
      });

      for (const mod of dbModifiers) {
        if (mod.activeRecipeId) {
          await explodeRecipe(mod.activeRecipeId, item.quantity);
        }
      }
    }
  }

  return Object.values(result);
}

/**
 * Validates if the current stock of all required ingredients is sufficient for the items.
 * Returns { success: true } or { success: false, message, insufficientItem }.
 */
export async function checkStockAvailability(items: InventoryOrderItem[], tx = prisma): Promise<InventoryResult> {
  try {
    const requiredIngredients = await getRequiredIngredients(items, tx);

    for (const req of requiredIngredients) {
      if (req.ingredient.currentStock < req.requiredQty) {
        return {
          success: false,
          message: `المخزون غير كافي لـ "${req.ingredient.name}": المطلوب ${req.requiredQty.toFixed(1)} ${req.ingredient.unit} والمتوفر ${req.ingredient.currentStock.toFixed(1)} ${req.ingredient.unit}`,
          insufficientItem: req.ingredient.name,
        };
      }
    }

    return { success: true, message: "Stock is sufficient" };
  } catch (error: any) {
    return { success: false, message: `تعذر التحقق من المخزون: ${error.message}` };
  }
}

/**
 * Deducts stock for a confirmed order and logs transaction records.
 * Can use an optional parent Prisma transaction runner.
 */
export async function validateAndDeductStock(
  orderId: string,
  items: InventoryOrderItem[],
  userId?: string | null,
  externalTx?: any
): Promise<InventoryResult> {
  const runner = async (tx: any) => {
    const required = await getRequiredIngredients(items, tx);

    const lowStockAlerts: string[] = [];

    // 1. Validate all requirements before making any modifications
    for (const req of required) {
      const dbIng = await tx.ingredient.findUnique({
        where: { id: req.ingredientId },
      });

      if (!dbIng) continue;

      if (dbIng.currentStock < req.requiredQty) {
        throw new Error(
          `المخزون غير كافي لـ "${dbIng.name}": المطلوب ${req.requiredQty.toFixed(1)} ${dbIng.unit} والمتوفر ${dbIng.currentStock.toFixed(1)} ${dbIng.unit}`
        );
      }
    }

    // 2. Deduct and record transactions
    for (const req of required) {
      const ingId = req.ingredient.id;
      const dbIng = await tx.ingredient.findUnique({ where: { id: ingId } });
      if (!dbIng) continue;

      const beforeQty = dbIng.currentStock;
      const afterQty = beforeQty - req.requiredQty;

      // Update Stock (with constraint against negative quantities)
      await tx.ingredient.update({
        where: { id: ingId },
        data: {
          currentStock: {
            decrement: req.requiredQty,
          },
        },
      });

      // Log Transaction
      await tx.inventoryTransaction.create({
        data: {
          ingredientId: ingId,
          type: "Consumption",
          quantity: -req.requiredQty,
          beforeQty,
          afterQty,
          note: `الاستهلاك التلقائي للمبيع في الطلب رقم #${orderId}`,
          userId: userId || null,
        },
      });

      // Flag low stock alert
      if (afterQty <= dbIng.lowStockLevel) {
        lowStockAlerts.push(dbIng.name);
      }
    }

    return {
      success: true,
      message: "تم خصم الكميات من المخزون بنجاح",
      lowStockAlerts,
    };
  };

  if (externalTx) {
    return await runner(externalTx);
  } else {
    return await prisma.$transaction(runner);
  }
}

/**
 * Reverts/Refunds stock for a cancelled order or voided item and logs transaction records.
 */
export async function revertOrderStock(
  orderId: string,
  items: InventoryOrderItem[],
  userId?: string | null,
  isVoid = false,
  externalTx?: any
): Promise<InventoryResult> {
  const runner = async (tx: any) => {
    const required = await getRequiredIngredients(items, tx);

    for (const req of required) {
      const ingId = req.ingredient.id;
      const dbIng = await tx.ingredient.findUnique({ where: { id: ingId } });
      if (!dbIng) continue;

      const beforeQty = dbIng.currentStock;
      const afterQty = beforeQty + req.requiredQty;

      // Update Stock
      await tx.ingredient.update({
        where: { id: ingId },
        data: {
          currentStock: {
            increment: req.requiredQty,
          },
        },
      });

      // Log Transaction
      await tx.inventoryTransaction.create({
        data: {
          ingredientId: ingId,
          type: isVoid ? "Adjustment" : "Refund",
          quantity: req.requiredQty,
          beforeQty,
          afterQty,
          note: isVoid 
            ? `إرجاع للمخزون إثر إلغاء صنف في الطلب رقم #${orderId}`
            : `إرجاع للمخزون إثر إلغاء/تعديل الطلب رقم #${orderId}`,
          userId: userId || null,
        },
      });
    }

    return {
      success: true,
      message: "تم إرجاع المكونات للمخزون تلقائياً",
    };
  };

  if (externalTx) {
    return await runner(externalTx);
  } else {
    return await prisma.$transaction(runner);
  }
}

/**
 * Dynamically adjusts stock levels by comparing an old item list and a new item list.
 * Ensures that if more items of a recipe are ordered, stock is subtracted, or if items are cancelled,
 * those components are credited back immediately.
 * Reverts the old items entirely and consummates the new items within a safe atomic transaction.
 */
export async function adjustOrderStock(
  orderId: string,
  oldItems: InventoryOrderItem[],
  newItems: InventoryOrderItem[],
  userId?: string | null
): Promise<InventoryResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Temporarily credit back all ingredients from the old item list
    const oldRequired = await getRequiredIngredients(oldItems, tx);
    for (const req of oldRequired) {
      const ingId = req.ingredient.id;
      await tx.ingredient.update({
        where: { id: ingId },
        data: { currentStock: { increment: req.requiredQty } },
      });
    }

    // 2. Validate that the new ingredient requirements are fully satisfied
    const newRequired = await getRequiredIngredients(newItems, tx);
    for (const req of newRequired) {
      const dbIng = await tx.ingredient.findUnique({
        where: { id: req.ingredient.id },
      });
      if (!dbIng || dbIng.currentStock < req.requiredQty) {
        // Rollback triggers automatically due to error throw inside transactions
        throw new Error(
          `المخزون غير كافي لتعديل الطلب. المكون "${req.ingredient.name}" المطلوب له ${req.requiredQty.toFixed(1)} ${req.ingredient.unit} والمتوفر حالياً ${dbIng ? dbIng.currentStock.toFixed(1) : 0} ${req.ingredient.unit}`
        );
      }
    }

    // 3. Subtract new requirements and write historic transactions
    const lowStockAlerts: string[] = [];

    // We can calculate the net diff per ingredient so that audit logs remain clean and simple.
    const netDeltas: {
      [id: string]: {
        ingredient: any;
        delta: number; // positive = added stock (we put back original, and subtracted less), negative = consumed stock
      };
    } = {};

    for (const req of oldRequired) {
      const ingId = req.ingredient.id;
      if (!netDeltas[ingId]) {
        netDeltas[ingId] = { ingredient: req.ingredient, delta: 0 };
      }
      netDeltas[ingId].delta += req.requiredQty; // We put back
    }

    for (const req of newRequired) {
      const ingId = req.ingredient.id;
      if (!netDeltas[ingId]) {
        netDeltas[ingId] = { ingredient: req.ingredient, delta: 0 };
      }
      netDeltas[ingId].delta -= req.requiredQty; // We subtract
    }

    // Apply net shifts
    for (const ingId of Object.keys(netDeltas)) {
      const { ingredient, delta } = netDeltas[ingId];
      if (delta === 0) continue; // No change for this ingredient

      const dbIng = await tx.ingredient.findUnique({ where: { id: ingId } });
      if (!dbIng) continue;

      const beforeQty = dbIng.currentStock; // Remember, we already incremented beforeQty during step 1 but we need to fetch live state
      // Apply the net delta
      const netQtyChange = delta; // e.g. -50ml
      const targetQty = beforeQty + netQtyChange;

      await tx.ingredient.update({
        where: { id: ingId },
        data: { currentStock: targetQty },
      });

      // Log transaction
      await tx.inventoryTransaction.create({
        data: {
          ingredientId: ingId,
          type: netQtyChange > 0 ? "Refund" : "Consumption",
          quantity: netQtyChange,
          beforeQty,
          afterQty: targetQty,
          note: `تعديل تلقائي للمخزون إثر تغيير بنود الطلب رقم #${orderId}`,
          userId: userId || null,
        },
      });

      if (targetQty <= dbIng.lowStockLevel) {
        lowStockAlerts.push(dbIng.name);
      }
    }

    return {
      success: true,
      message: "تم تعديل كميات المخزون للطلب المطوّر بنجاح",
      lowStockAlerts,
    };
  });
}
