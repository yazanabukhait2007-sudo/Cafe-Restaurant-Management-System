import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ include: { variants: true } });
  console.log(`Checking ${products.length} products...`);

  for (const product of products) {
    if (!product.activeRecipeId) {
        // Create recipe for product
        const newRecipe = await prisma.recipe.create({
          data: {
            name: `${product.name} Recipe`,
            productId: product.id,
            isActive: true,
          },
        });
        await prisma.product.update({
            where: { id: product.id },
            data: { activeRecipeId: newRecipe.id },
        });
        console.log(`Created recipe for product: ${product.name}`);
    }

    // Check variants
    for (const variant of product.variants) {
      if (!variant.activeRecipeId) {
        const newVariantRecipe = await prisma.recipe.create({
          data: {
            name: `${product.name} - ${variant.name} Recipe`,
            productId: product.id,
            productVariantId: variant.id,
            isActive: true,
          },
        });
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { activeRecipeId: newVariantRecipe.id },
        });
        console.log(`Created recipe for variant: ${product.name} - ${variant.name}`);
      } else {
        // Fix existing recipe if missing productId
        await prisma.recipe.update({
          where: { id: variant.activeRecipeId },
          data: { productId: product.id }
        });
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
