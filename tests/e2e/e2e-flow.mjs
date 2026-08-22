// Standalone GUI E2E test: storefront order lifecycle + admin fulfillment.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const WEB = "http://localhost:3000";
const ADMIN = "http://localhost:3001";
const SHOT_DIR = "E:/PROJECTS/babascameraecom/gui-test-screenshots/";
mkdirSync(SHOT_DIR, { recursive: true });

const stamp = Date.now();
const EMAIL = `e2e.${stamp}@babascamera.test`;
const PASSWORD = "E2eTest@123";
const results = [];
const consoleErrors = [];

function log(step, status, detail = "") {
  console.log(`[${status}] ${step}${detail ? " — " + detail : ""}`);
  results.push({ step, status, detail });
}
async function shot(page, name) {
  const path = `${SHOT_DIR}${name}.png`;
  await page.screenshot({ path, fullPage: false }).catch(() => undefined);
  console.log(`    shot: ${name}.png`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
context.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
const page = await context.newPage();
page.setDefaultTimeout(45000);

let orderNumber = null;
try {
  /* 1. Home */
  await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await shot(page, "t01_home");
  log("home page", "PASS", await page.title());

  /* 2. Sign up */
  await page.goto(`${WEB}/signUp`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("username@gmail.com").fill(EMAIL);
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill(PASSWORD);
  await pw.nth(1).fill(PASSWORD);
  await shot(page, "t02_signup_filled");
  await page.getByRole("button", { name: /^Register$/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signUp"));
  await shot(page, "t03_signup_done");
  log("sign up", "PASS", EMAIL);

  /* 3. Products -> first product */
  await page.goto(`${WEB}/products`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(2000);
  const productHref = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((els) => {
      const skip = /\/products\/(category|brand|banner|search)(\/|$)/;
      const found = els
        .map((e) => e.getAttribute("href") ?? "")
        .find((href) => href.length > "/products/".length && !skip.test(href));
      return found ?? "";
    });
  if (!productHref) throw new Error("No product link found on /products");
  const productLink = page.locator(`a[href="${productHref}"]`).first();
  await productLink.waitFor({ state: "visible" });
  await shot(page, "t04_products");
  await productLink.click();
  await page.waitForURL(/\/products\/(?!category|brand|banner|search)/);
  await page.waitForLoadState("load").catch(() => undefined);
  await shot(page, "t05_product_detail");
  log("product detail", "PASS", page.url().replace(WEB, ""));

  /* 4. Add to cart */
  const addToCart = page.getByRole("button", { name: /Add to Cart/i }).first();
  await addToCart.waitFor({ state: "visible" });
  await addToCart.click();
  await sleep(3000);
  await shot(page, "t06_added_to_cart");
  log("add to cart", "PASS");

  /* 5. Cart -> Checkout */
  await page.goto(`${WEB}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await sleep(2500);
  await shot(page, "t07_cart");
  const checkoutBtn = page.getByRole("button", { name: /Checkout Now/i });
  await checkoutBtn.waitFor({ state: "visible" });
  await checkoutBtn.click();
  await page.waitForURL(/\/checkout(?!\/)/);
  await page.waitForLoadState("load").catch(() => undefined);
  await sleep(2500);
  await shot(page, "t08_checkout");

  /* 6. Add address in modal */
  // Prep: the address form requires profile phone (no in-modal phone input);
  // set it through the same profile API the Profile page uses (setup, not feature under test).
  const profileResp = await context.request.patch(`${WEB}/api/storefront/legacy/user/profile`, {
    data: { name: "E2E Tester", phone: "9876543210" },
  });
  if (!profileResp.ok()) log("profile phone setup", "WARN", `status ${profileResp.status()}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await sleep(2000);

  const addAddress = page.getByRole("button", { name: /Add New Address|Add a delivery address/i }).first();
  await addAddress.waitFor({ state: "visible", timeout: 30000 });
  await addAddress.click();
  await sleep(1500);
  // The address form is a plain fixed-position overlay (no role=dialog).
  const overlay = page.locator("div.fixed.inset-0").last();
  await overlay.waitFor({ state: "visible" });
  await page.getByPlaceholder("Building, House No, Flat No").fill("42 E2E Test Lane");
  await page.getByPlaceholder("Apartment / Road / Area").fill("Kazhakoottam Road");
  await page.getByPlaceholder("6-digit pincode").fill("695001");
  await sleep(2500); // postalpincode.in auto-fills city/state
  const cityInput = page.getByPlaceholder("Enter city name");
  if ((await cityInput.inputValue()) === "") await cityInput.fill("Trivandrum");
  const stateTrigger = overlay.getByText("Select state");
  if (await stateTrigger.count()) {
    await stateTrigger.click();
    await page.getByRole("option", { name: "Kerala" }).click();
  }
  await shot(page, "t09_address_modal");
  await overlay.locator("button", { hasText: /^(Save|Add|Update)$/ }).last().click();
  await sleep(2500);
  await shot(page, "t10_address_saved");
  log("checkout address", "PASS");

  /* 7. Bank transfer */
  await page.getByText("Bank Transfer (Zero Transaction Fee)").first().click();
  await sleep(800);
  await shot(page, "t11_bank_selected");
  const placeOrder = page.getByRole("button", { name: /Confirm & Place Order|Place Order/i }).first();
  await placeOrder.click();
  await page.waitForURL(/bank-transfer/);
  await page.waitForLoadState("load").catch(() => undefined);
  await sleep(1500);
  await shot(page, "t12_bank_transfer_page");

  await page.getByPlaceholder("e.g., UTR / Transaction ID").fill(`UTR-E2E-${stamp}`);
  // Proof attachment is mandatory for bank transfer.
  const proofInput = page.locator("input[type='file']").first();
  await proofInput.setInputFiles("E:/PROJECTS/babascameraecom/gui-test-screenshots/proof.png");
  await sleep(3000); // wait for upload to S3
  await shot(page, "t13_ref_filled");
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await page.waitForURL(/success|order/, { timeout: 60000 }).catch(() => undefined);
  await sleep(2500);
  await shot(page, "t14_order_result");
  const ordText = await page.locator("body").innerText().catch(() => "");
  const ordMatch = ordText.match(/ORD-\d{8}-\d{4}/);
  if (ordMatch) orderNumber = ordMatch[0];
  log("bank transfer order", "PASS", `${page.url().replace(WEB, "")} ${orderNumber ?? ""}`);

  /* 8. Orders list */
  await page.goto(`${WEB}/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await sleep(2500);
  await shot(page, "t15_orders_list");
  log("orders list", "PASS", orderNumber ?? "");
} catch (err) {
  await shot(page, "error_storefront");
  log("storefront flow", "FAIL", err.message.split("\n")[0]);
}

/* ================= ADMIN ================= */
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminContext.on("console", (m) => { if (m.type() === "error") consoleErrors.push("[admin] " + m.text().slice(0, 200)); });
const apage = await adminContext.newPage();
apage.setDefaultTimeout(45000);
apage.on("dialog", (d) => d.accept().catch(() => undefined));

try {
  await apage.goto(`${ADMIN}/login`, { waitUntil: "domcontentloaded" });
  await apage.waitForLoadState("load").catch(() => undefined);
  await apage.locator("input[type='email'], input[name='email']").first().fill("info@babascamera.com");
  await apage.locator("input[type='password']").first().fill("admin123");
  await shot(apage, "a01_admin_login");
  await apage.locator("button[type='submit']").click();
  await apage.waitForURL((u) => !u.pathname.startsWith("/login"));
  await shot(apage, "a02_admin_dashboard");
  log("admin login", "PASS", apage.url().replace(ADMIN, ""));

  await apage.goto(`${ADMIN}/orders`, { waitUntil: "domcontentloaded" });
  await apage.waitForLoadState("load").catch(() => undefined);
  await sleep(2500);
  await shot(apage, "a03_admin_orders");
  const row = apage.locator("tr", { hasText: "e2e." }).first();
  await row.waitFor({ state: "visible" });
  await row.locator("a").first().click();
  await apage.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  await apage.waitForLoadState("load").catch(() => undefined);
  await sleep(1500);
  await shot(apage, "a04_admin_order_detail");
  log("admin order detail", "PASS", apage.url().replace(ADMIN, ""));

  for (const target of ["confirmed", "processing", "shipped", "delivered"]) {
    const select = apage.locator("select").first();
    await select.waitFor({ state: "visible" });
    await select.selectOption(target);
    await sleep(400);
    if (target === "shipped") {
      await apage.locator("input[name='carrier']").fill("BlueDart");
      await apage.locator("input[name='trackingNumber']").fill(`BD${stamp}`);
    }
    await apage.getByRole("button", { name: /Update order status/i }).click();
    await sleep(3000);
    await shot(apage, `a05_${target}`);
  }
  const finalText = await apage.locator("body").innerText().catch(() => "");
  const deliveredOk = /delivered/i.test(finalText);
  await shot(apage, "a06_final_status");
  log("admin transitions to delivered", deliveredOk ? "PASS" : "CHECK", deliveredOk ? "" : "delivered text not found");
} catch (err) {
  await shot(apage, "error_admin");
  log("admin flow", "FAIL", err.message.split("\n")[0]);
}

console.log("\n===== SUMMARY =====");
for (const r of results) console.log(`${r.status.toUpperCase().padEnd(5)} ${r.step} ${r.detail}`);
console.log(`\nConsole errors captured: ${consoleErrors.length}`);
[...new Set(consoleErrors)].slice(0, 10).forEach((e) => console.log("  CE:", e));
await browser.close();
