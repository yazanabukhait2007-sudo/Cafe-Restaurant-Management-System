import { prisma } from "./prisma.ts";

/**
 * Advanced Cost Calculation Engine
 */
export async function calculateRecipeCost(recipeId: string, tx = prisma): Promise<number> {
  const recipe = await tx.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              recipe: true // For semi-finished logic
            }
          }
        }
      }
    }
  });

  if (!recipe) return 0;

  let totalCost = 0;

  for (const item of recipe.ingredients) {
    let baseUnitCost = item.ingredient.cost;

    // If it's a semi-finished product, we might want to use its recipe cost if it exists
    // (though usually, we use the purchase cost or a theoretical cost)
    if (item.ingredient.isSemiFinished && item.ingredient.recipeId) {
      // Option: baseUnitCost = await calculateRecipeCost(item.ingredient.recipeId, tx);
      // For now, we prefer the set cost on the ingredient as it represents "last batch cost"
    }

    totalCost += item.quantity * baseUnitCost;
  }

  return totalCost;
}

/**
 * Updates the cached costPrice for a product or variant
 */
export async function updateProductCost(productId: string, tx = prisma) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: {
      activeRecipe: true,
      variants: {
        include: { activeRecipe: true }
      },
      modifierGroups: {
        include: {
          modifierGroup: {
            include: {
              modifiers: {
                include: { activeRecipe: true }
              }
            }
          }
        }
      }
    }
  });

  if (!product) return;

  // 1. Calc base product cost
  let productCost = 0;
  if (product.activeRecipeId) {
    productCost = await calculateRecipeCost(product.activeRecipeId, tx);
  }

  await tx.product.update({
    where: { id: productId },
    data: { costPrice: productCost }
  });

  // 2. Calc variant costs
  for (const variant of product.variants) {
    let variantCost = 0;
    if (variant.activeRecipeId) {
      variantCost = await calculateRecipeCost(variant.activeRecipeId, tx);
    } else {
      // Fallback to product cost if no specific variant recipe?
      // Usually variations like sizes specify their own recipe.
      variantCost = productCost; 
    }
    await tx.productVariant.update({
      where: { id: variant.id },
      data: { costPrice: variantCost }
    });
  }

  // 3. Calc modifier costs
  for (const pg of product.modifierGroups) {
    for (const mod of pg.modifierGroup.modifiers) {
      if (mod.activeRecipeId) {
        const modCost = await calculateRecipeCost(mod.activeRecipeId, tx);
        await tx.modifier.update({
          where: { id: mod.id },
          data: { costPrice: modCost }
        });
      }
    }
  }
}
