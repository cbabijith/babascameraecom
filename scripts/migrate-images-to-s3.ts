import {
  getDatabase,
  categories,
  brands,
  productImages,
  homeBanners,
  eq,
} from "../packages/db/src/index.ts";
import { uploadToS3, getPublicUrlForS3Key } from "../packages/db/src/storage/index.ts";

function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

async function downloadBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: HTTP ${res.status}`);
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || mimeFromFilename(url);
    return { buffer: Buffer.from(arrayBuf), contentType };
  } catch (err) {
    console.error(`Error downloading ${url}:`, err);
    return null;
  }
}

async function run() {
  console.log("=== Starting Image Migration to Tigris S3 Bucket ===");
  const db = getDatabase();

  // 1. Categories
  const catList = await db.select().from(categories);
  console.log(`\n--- Migrating ${catList.length} Categories ---`);
  let catMigrated = 0;
  for (const cat of catList) {
    if (!cat.imageUrl || cat.imageUrl.includes("storageapi.dev")) continue;
    const filename = cat.imageUrl.split("/").pop()?.split("?")[0] || "image.webp";
    const key = `categories/${cat.id}/${filename}`;
    const downloaded = await downloadBuffer(cat.imageUrl);
    if (downloaded) {
      const { url: newUrl } = await uploadToS3({
        key,
        body: downloaded.buffer,
        contentType: downloaded.contentType,
      });
      await db.update(categories).set({ imageUrl: newUrl, updatedAt: new Date() }).where(eq(categories.id, cat.id));
      console.log(`[Category] ${cat.name} -> ${newUrl}`);
      catMigrated++;
    }
  }

  // 2. Brands
  const brandList = await db.select().from(brands);
  console.log(`\n--- Migrating ${brandList.length} Brands ---`);
  let brandMigrated = 0;
  for (const brand of brandList) {
    if (!brand.logoUrl || brand.logoUrl.includes("storageapi.dev")) continue;
    const filename = brand.logoUrl.split("/").pop()?.split("?")[0] || "logo.webp";
    const key = `brands/${brand.id}/${filename}`;
    const downloaded = await downloadBuffer(brand.logoUrl);
    if (downloaded) {
      const { url: newUrl } = await uploadToS3({
        key,
        body: downloaded.buffer,
        contentType: downloaded.contentType,
      });
      await db.update(brands).set({ logoUrl: newUrl, updatedAt: new Date() }).where(eq(brands.id, brand.id));
      console.log(`[Brand] ${brand.name} -> ${newUrl}`);
      brandMigrated++;
    }
  }

  // 3. Product Images
  const pImageList = await db.select().from(productImages);
  console.log(`\n--- Migrating ${pImageList.length} Product Images ---`);
  let pImgMigrated = 0;
  for (const pImg of pImageList) {
    if (!pImg.url || pImg.url.includes("storageapi.dev")) continue;
    const filename = pImg.url.split("/").pop()?.split("?")[0] || `${pImg.id}.webp`;
    const key = `products/${pImg.productId}/${filename}`;
    const downloaded = await downloadBuffer(pImg.url);
    if (downloaded) {
      const { url: newUrl } = await uploadToS3({
        key,
        body: downloaded.buffer,
        contentType: downloaded.contentType,
      });
      await db.update(productImages).set({ url: newUrl, updatedAt: new Date() }).where(eq(productImages.id, pImg.id));
      console.log(`[Product Image ${pImg.position}] -> ${newUrl}`);
      pImgMigrated++;
    }
  }

  // 4. Home Banners
  const bannerList = await db.select().from(homeBanners);
  console.log(`\n--- Migrating ${bannerList.length} Home Banners ---`);
  let bannerMigrated = 0;
  for (const banner of bannerList) {
    const updates: Partial<typeof homeBanners.$inferInsert> = {};
    if (banner.desktopMediaUrl && !banner.desktopMediaUrl.includes("storageapi.dev")) {
      const filename = banner.desktopMediaUrl.split("/").pop()?.split("?")[0] || "desktop.webp";
      const key = `banners/desktop/${banner.id}-${filename}`;
      const downloaded = await downloadBuffer(banner.desktopMediaUrl);
      if (downloaded) {
        const { url: newUrl } = await uploadToS3({ key, body: downloaded.buffer, contentType: downloaded.contentType });
        updates.desktopMediaUrl = newUrl;
      }
    }
    if (banner.mobileMediaUrl && !banner.mobileMediaUrl.includes("storageapi.dev")) {
      const filename = banner.mobileMediaUrl.split("/").pop()?.split("?")[0] || "mobile.webp";
      const key = `banners/mobile/${banner.id}-${filename}`;
      const downloaded = await downloadBuffer(banner.mobileMediaUrl);
      if (downloaded) {
        const { url: newUrl } = await uploadToS3({ key, body: downloaded.buffer, contentType: downloaded.contentType });
        updates.mobileMediaUrl = newUrl;
      }
    }
    if (banner.posterUrl && !banner.posterUrl.includes("storageapi.dev")) {
      const filename = banner.posterUrl.split("/").pop()?.split("?")[0] || "poster.webp";
      const key = `banners/poster/${banner.id}-${filename}`;
      const downloaded = await downloadBuffer(banner.posterUrl);
      if (downloaded) {
        const { url: newUrl } = await uploadToS3({ key, body: downloaded.buffer, contentType: downloaded.contentType });
        updates.posterUrl = newUrl;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(homeBanners).set({ ...updates, updatedAt: new Date() }).where(eq(homeBanners.id, banner.id));
      console.log(`[Banner] ${banner.internalName} updated`);
      bannerMigrated++;
    }
  }

  console.log("\n=== Migration Complete! ===");
  console.log({
    categoriesMigrated: catMigrated,
    brandsMigrated: brandMigrated,
    productImagesMigrated: pImgMigrated,
    bannersMigrated: bannerMigrated,
  });

  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
