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
router.get("/products", authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            activeRecipe: {
              include: {
                ingredients: {
                  include: { ingredient: true }
                }
              }
            }
          }
        },
        activeRecipe: {
          include: {
            ingredients: {
              include: { ingredient: true }
            }
          }
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { modifiers: true }
            }
          }
        }
      }
    });

    // Smart Availability Calculation
    const productsWithAvailability = products.map(product => {
      let isActuallyAvailable = product.isAvailable;
      
      if (!isActuallyAvailable) return { ...product, isAvailable: false };

      const checkRecipeAvailability = (recipe: any) => {
        if (!recipe) return true;
        // Check if all ingredients in the recipe have stock > 0
        // We could also check if ri.quantity <= ri.ingredient.currentStock if we wanted more precision
        return recipe.ingredients.every((ri: any) => ri.ingredient.currentStock > 0);
      };

      // Check main product recipe
      if (product.activeRecipe && !checkRecipeAvailability(product.activeRecipe)) {
        isActuallyAvailable = false;
      }

      // Format modifier groups for frontend
      const modifierGroups = product.modifierGroups.map(pmg => pmg.modifierGroup);

      return { 
        ...product, 
        isAvailable: isActuallyAvailable,
        modifierGroups 
      };
    });

    res.json(productsWithAvailability);
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

router.post("/products", authenticate, authorize(["inventory:manage"]), validate({ body: createProductSchema }), async (req, res) => {
  const { categoryId, categoryName, name, description, price, image, variants } = req.body;
  try {
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && (categoryName || req.body.category)) {
      const catName = categoryName || req.body.category;
      let cat = await prisma.category.findUnique({
        where: { name: catName }
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: catName }
        });
      }
      resolvedCategoryId = cat.id;
    }

    if (!resolvedCategoryId) {
      const firstCat = await prisma.category.findFirst();
      if (firstCat) {
        resolvedCategoryId = firstCat.id;
      } else {
        const cat = await prisma.category.create({
          data: { name: "General" }
        });
        resolvedCategoryId = cat.id;
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          categoryId: resolvedCategoryId,
          name,
          description: description || "",
          price,
          image: image || "",
          variants: {
            create: variants || [],
          },
        },
      });

      // Automatically create a simple recipe for the product
      const newRecipe = await tx.recipe.create({
        data: {
          name: `${name} Recipe`,
          productId: newProduct.id,
          isActive: true,
        },
      });

      // Link the recipe as active for the product
      await tx.product.update({
        where: { id: newProduct.id },
        data: { activeRecipeId: newRecipe.id },
      });

      // Automatically create recipes for variants if they were created
      if (variants && variants.length > 0) {
        const createdVariants = await tx.productVariant.findMany({
          where: { productId: newProduct.id }
        });
        
        for (const variant of createdVariants) {
          const newVariantRecipe = await tx.recipe.create({
            data: {
              name: `${name} - ${variant.name} Recipe`,
              productId: newProduct.id,
              productVariantId: variant.id,
              isActive: true,
            },
          });
          
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { activeRecipeId: newVariantRecipe.id },
          });
        }
      }

      return newProduct;
    });
    
    res.json(product);
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
});

export default router;
