import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ where: { activeRecipeId: null } });
  console.log(`Found ${products.length} products without recipes.`);

  for (const product of products) {
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
    console.log(`Created recipe for: ${product.name}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
