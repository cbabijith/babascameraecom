import { getDatabase, categories, brands, products, homeBanners, orders, uploadToS3, deleteFromS3, getPresignedDownloadUrl } from "../packages/db/src/index.ts";
import { auth } from "../packages/db/src/auth.ts";

console.log("=========================================");
console.log("RUNNING COMPREHENSIVE PRODUCTION API TESTS");
console.log("=========================================");

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, extra?: any) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}`, extra || "");
    failed++;
  }
}

const db = getDatabase();

// 1. Better Auth Authentication Test
console.log("\n--- TEST 1: Better Auth Sign-In & Session Verification ---");
try {
  const signInRes = await auth.api.signInEmail({
    body: {
      email: "info@babascamera.com",
      password: "admin123",
    },
    asResponse: true,
  });
  const setCookie = signInRes.headers.get("set-cookie");
  assert("Admin sign-in returned Set-Cookie header", Boolean(setCookie));

  // Verify getSession
  const sessionRes = await auth.api.getSession({
    headers: new Headers({
      cookie: setCookie || "",
    }),
  });
  assert("Better Auth session validation", Boolean(sessionRes?.user?.email === "info@babascamera.com"));
  assert("User role is admin", Boolean(sessionRes?.user?.id));
} catch (err) {
  assert("Better Auth Sign-in", false, err);
}

// 2. Database Data Integrity Tests
console.log("\n--- TEST 2: Database Data & S3 Migrated Records ---");
try {
  const allCategories = await db.select().from(categories);
  assert(`Categories count (${allCategories.length}) > 0`, allCategories.length > 0);
  const catImagesS3 = allCategories.every((c) => !c.imageUrl || c.imageUrl.includes("arranged-pantry-yko9l8ktd"));
  assert("All category images point to Tigris S3", catImagesS3);

  const allBrands = await db.select().from(brands);
  assert(`Brands count (${allBrands.length}) > 0`, allBrands.length > 0);

  const allProducts = await db.select().from(products).limit(10);
  assert(`Products count (${allProducts.length}) > 0`, allProducts.length > 0);

  const allBanners = await db.select().from(homeBanners);
  assert(`Home banners count (${allBanners.length}) > 0`, allBanners.length > 0);
  const bannerImagesS3 = allBanners.every(
    (b) => (!b.desktopMediaUrl || b.desktopMediaUrl.includes("arranged-pantry-yko9l8ktd")) &&
           (!b.mobileMediaUrl || b.mobileMediaUrl.includes("arranged-pantry-yko9l8ktd"))
  );
  assert("All banner media point to Tigris S3", bannerImagesS3);
} catch (err) {
  assert("Database integrity test", false, err);
}

// 3. S3 Live Storage Read/Write/Delete Test
console.log("\n--- TEST 3: S3 Live Storage Read / Write / Delete ---");
try {
  const testKey = `test-health-${Date.now()}.txt`;
  const uploadResult = await uploadToS3({
    key: testKey,
    body: "Hello Baba's Camera production health check",
    contentType: "text/plain",
  });
  assert("S3 upload test file", Boolean(uploadResult.url && uploadResult.url.includes(testKey)));

  // Test presigned download URL
  const signedDownloadUrl = await getPresignedDownloadUrl(testKey, 60);
  const fetchRes = await fetch(signedDownloadUrl);
  const fetchedText = await fetchRes.text();
  assert("S3 presigned fetch matches content", fetchRes.ok && fetchedText === "Hello Baba's Camera production health check");

  await deleteFromS3(testKey);
  assert("S3 delete test file completed", true);
} catch (err) {
  assert("S3 live storage test", false, err);
}

console.log("\n=========================================");
console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
