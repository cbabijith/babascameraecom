import {
  getDatabase,
  products,
  brands,
  productImages,
  asc,
  eq,
} from "../packages/db/src/index.ts";

async function run() {
  const db = getDatabase();

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      slug: products.slug,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .orderBy(asc(products.createdAt))
    .limit(20);

  const result = [];
  for (const row of rows) {
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.position));
    result.push({
      ...row,
      images: images.map((img) => ({
        id: img.id,
        position: img.position,
        isPrimary: img.isPrimary,
        url: img.url,
      })),
    });
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
