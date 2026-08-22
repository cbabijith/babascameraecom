/**
 * Test data cleanup: removes every account and order created by automated
 * test runs (emails matching the known test patterns) from the shared
 * database, plus their uploaded payment proofs in S3.
 *
 * Run: bun scripts/cleanup-test-data.ts
 */
import {
  getDatabase,
  users,
  orders,
  orderItems,
  orderStatusHistory,
  paymentEvents,
  carts,
  cartItems,
  addresses,
  wishlists,
  sessions,
  accounts,
  eq,
  like,
  or,
  inArray,
} from "../packages/db/src/index.ts";
import { deleteFromS3 } from "../packages/db/src/storage/index.ts";

const TEST_EMAIL_PATTERNS = [
  "smoke.%",
  "e2e.%",
  "dbg.%",
  "dbg2.%",
  "chk.%",
  "addr.%",
  "sv.%",
  "sv2.%",
  "sv3.%",
  "sv4.%",
  "bt.%",
  "cancel.%",
];

const db = getDatabase();

const testUsers = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(or(...TEST_EMAIL_PATTERNS.map((pattern) => like(users.email, pattern))));

if (testUsers.length === 0) {
  console.log("No test accounts found. Nothing to clean.");
  process.exit(0);
}

const ids = testUsers.map((u) => u.id);
console.log(`Cleaning ${testUsers.length} test account(s):`);
for (const u of testUsers) console.log(`  - ${u.email}`);

// collect proof file keys before deleting rows (notes contain proof URLs)
const testOrders = await db
  .select({ id: orders.id, notes: orders.notes })
  .from(orders)
  .where(inArray(orders.userId, ids));
const proofUrls: string[] = [];
for (const order of testOrders) {
  const match = order.notes?.match(/Proof: (\S+)/);
  if (match) proofUrls.push(match[1]);
}

await db.transaction(async (tx) => {
  // child rows without cascade deletes
  await tx.delete(orderStatusHistory).where(inArray(orderStatusHistory.orderId, testOrders.map((o) => o.id)));
  await tx.delete(orderItems).where(inArray(orderItems.orderId, testOrders.map((o) => o.id)));
  await tx.delete(paymentEvents).where(inArray(paymentEvents.orderId, testOrders.map((o) => o.id)));
  await tx.delete(orders).where(inArray(orders.userId, ids));

  await tx.delete(cartItems).where(
    inArray(
      cartItems.cartId,
      db.select({ id: carts.id }).from(carts).where(inArray(carts.userId, ids)),
    ),
  );
  await tx.delete(carts).where(inArray(carts.userId, ids));
  await tx.delete(addresses).where(inArray(addresses.userId, ids));
  await tx.delete(wishlists).where(inArray(wishlists.userId, ids));
  await tx.delete(sessions).where(inArray(sessions.userId, ids));
  await tx.delete(accounts).where(inArray(accounts.userId, ids));
  await tx.delete(users).where(inArray(users.id, ids));
});

console.log(`Deleted ${testOrders.length} order(s) and all dependent rows.`);

// remove uploaded payment proofs from S3
let removedProofs = 0;
for (const url of proofUrls) {
  try {
    const key = new URL(url).pathname.replace(/^\/+/, "").replace(/^[^/]+\//, "");
    await deleteFromS3(key);
    removedProofs += 1;
  } catch (error) {
    console.warn(`Proof cleanup skipped (${url}):`, error instanceof Error ? error.message : error);
  }
}
console.log(`Removed ${removedProofs}/${proofUrls.length} payment proof file(s) from S3.`);
console.log("Cleanup complete.");
process.exit(0);
