import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ include: { variants: true } });
  const recipesCount = await prisma.recipe.count();
  console.log(`Products: ${products.length}`);
  console.log(`Recipes Count: ${recipesCount}`);
  
  for (const p of products) {
    console.log(`Product: ${p.name} (ActiveRecipeId: ${p.activeRecipeId})`);
    
    // Check if a recipe exists with this productId
    const recipes = await prisma.recipe.findMany({ where: { productId: p.id } });
    console.log(`  Recipes found: ${recipes.length}`);
    for(const r of recipes) {
        console.log(`    Recipe: ${r.name} (ProductId: ${r.productId}, VariantId: ${r.productVariantId})`);
    }
    
    for (const v of p.variants) {
        console.log(`  Variant: ${v.name} (ActiveRecipeId: ${v.activeRecipeId})`);
        const vRecipe = await prisma.recipe.findMany({ where: { productVariantId: v.id } });
        console.log(`    Recipes found: ${vRecipe.length}`);
        for(const vr of vRecipe) {
            console.log(`      Recipe: ${vr.name} (ProductId: ${vr.productId}, VariantId: ${vr.productVariantId})`);
        }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
