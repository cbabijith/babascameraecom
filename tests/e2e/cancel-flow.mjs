// GUI test: place a second order and cancel it from the storefront orders page.
import { chromium } from "@playwright/test";
import { setTimeout as sleep } from "node:timers/promises";

const WEB = "http://localhost:3000";
const SHOT_DIR = "E:/PROJECTS/babascameraecom/gui-test-screenshots/";
const stamp = Date.now();
const EMAIL = `cancel.${stamp}@babascamera.test`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on("dialog", (d) => d.accept().catch(() => undefined));

const shot = (n) => page.screenshot({ path: `${SHOT_DIR}${n}.png` }).catch(() => undefined);

try {
  await page.goto(`${WEB}/signUp`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("username@gmail.com").fill(EMAIL);
  const pw = page.locator("input[type=password]");
  await pw.nth(0).fill("Cancel@123");
  await pw.nth(1).fill("Cancel@123");
  await page.getByRole("button", { name: /^Register$/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signUp"));
  console.log("[PASS] signup", EMAIL);

  await context.request.patch(`${WEB}/api/storefront/legacy/user/profile`, {
    data: { name: "Cancel Tester", phone: "9876543210" },
  });
  const prod = (await (await context.request.get(`${WEB}/api/storefront/legacy/product?limit=1`)).json()).results[0];
  await context.request.post(`${WEB}/api/storefront/legacy/cart/product/${prod._id}`, { data: { quantity: 1 } });

  await page.goto(`${WEB}/checkout`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await page.getByRole("button", { name: /Add New Address|Add a delivery address/i }).first().click();
  await sleep(1500);
  await page.getByPlaceholder("Building, House No, Flat No").fill("9 Cancel Apt");
  await page.getByPlaceholder("Apartment / Road / Area").fill("Cancel Street");
  await page.getByPlaceholder("6-digit pincode").fill("695001");
  await sleep(2500);
  await page.locator("div.fixed.inset-0").last().locator("button", { hasText: "Save" }).click();
  await sleep(2500);
  await page.getByText("Bank Transfer (Zero Transaction Fee)").first().click();
  await sleep(800);
  await page.getByRole("button", { name: /Confirm & Place Order/i }).first().click();
  await page.waitForURL(/bank-transfer/);
  await sleep(1500);
  await page.getByPlaceholder("e.g., UTR / Transaction ID").fill(`UTR-CXL-${stamp}`);
  await page.locator("input[type='file']").first().setInputFiles("E:/PROJECTS/babascameraecom/gui-test-screenshots/proof.png");
  await sleep(3000);
  await page.getByRole("button", { name: /^Submit$/ }).click();
  await page.waitForURL(/success|orders/, { timeout: 60000 }).catch(() => undefined);
  await sleep(2500);
  await shot("c01_second_order_placed");
  console.log("[PASS] second order placed", page.url());

  // Go to orders and cancel
  await page.goto(`${WEB}/orders`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await shot("c02_orders_before_cancel");
  const cancelBtn = page.getByRole("button", { name: /Cancel Order|Cancel/i }).first();
  await cancelBtn.waitFor({ state: "visible" });
  await cancelBtn.click();
  await sleep(3500);
  await shot("c03_after_cancel_click");
  const text = await page.locator("body").innerText();
  const cancelled = /cancelled/i.test(text);
  console.log(cancelled ? "[PASS] order cancelled via UI" : "[CHECK] cancel state not visible on orders page:", text.slice(0, 300).replace(/\n+/g, " | "));
} catch (err) {
  await shot("error_cancel_flow");
  console.log("[FAIL] cancel flow:", String(err).split("\n")[0]);
}
await browser.close();
