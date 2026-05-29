import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.ts";
import { calculateRecipeCost, updateProductCost } from "../lib/costEngine.ts";

const router = express.Router();

// Get all recipes
router.get("/", authenticate, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        product: true,
        productVariant: true,
        ingredients: {
          include: { ingredient: true }
        },
        preparationSteps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });
    res.json(recipes);
  } catch (error) {
    console.error("Failed to fetch recipes:", error);
    res.status(500).json({ message: "Failed to fetch recipes" });
  }
});

// Create a new recipe
router.post("/", authenticate, authorize(["menu:manage"]), async (req, res) => {
  const { productId, variantId, name, ingredients, steps, yield: yieldVal } = req.body;

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: {
          productId,
          productVariantId: variantId,
          name,
          yield: yieldVal || 1,
          ingredients: {
            create: ingredients.map((ri: any) => ({
              ingredientId: ri.ingredientId,
              quantity: ri.quantity,
              unit: ri.unit,
              wastagePercentage: ri.wastagePercentage || 0,
            }))
          },
          preparationSteps: {
            create: steps.map((s: any, idx: number) => ({
              instruction: s.description,
              stepNumber: s.stepNumber || idx + 1,
            }))
          }
        },
        include: {
          ingredients: { include: { ingredient: true } }
        }
      });

      // If this is the first recipe for the product/variant, make it active
      if (variantId) {
         await tx.productVariant.update({
           where: { id: variantId },
           data: { activeRecipeId: newRecipe.id }
         });
      } else {
         await tx.product.update({
           where: { id: productId },
           data: { activeRecipeId: newRecipe.id }
         });
      }

      return newRecipe;
    });

    // Calculate cost after creation
    await updateProductCost(productId);
    
    res.json(recipe);
  } catch (error) {
    console.error("Recipe creation error:", error);
    res.status(500).json({ message: "Failed to create recipe" });
  }
});

// Calculate recipe cost dynamically
router.post("/calculate-cost", authenticate, async (req, res) => {
  const { ingredients, yield: yieldVal } = req.body;
  if (!ingredients) return res.status(400).json({ message: "Missing ingredients" });

  try {
    const cost = await calculateRecipeCost(ingredients, yieldVal || 1);
    res.json({ cost });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate cost" });
  }
});

// Update product active recipe
router.patch("/:id/activate", authenticate, authorize(["menu:manage"]), async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    await prisma.$transaction(async (tx) => {
      if (recipe.productVariantId) {
        await tx.productVariant.update({
          where: { id: recipe.productVariantId },
          data: { activeRecipeId: recipe.id }
        });
      } else {
        await tx.product.update({
          where: { id: recipe.productId },
          data: { activeRecipeId: recipe.id }
        });
      }
    });

    await updateProductCost(recipe.productId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to activate recipe" });
  }
});

export default router;
