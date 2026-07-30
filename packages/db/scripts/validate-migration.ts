import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const migrationDirectory = fileURLToPath(new URL("../drizzle", import.meta.url));
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

if (migrationFiles.length !== 2) {
  throw new Error(
    `Expected the authoritative base and homepage banner migrations, found ${migrationFiles.length}: ${migrationFiles.join(", ")}`,
  );
}

const [migrationFile, bannerMigrationFile] = migrationFiles;

if (migrationFile === undefined || !migrationFile.endsWith("_initial_commerce.sql")) {
  throw new Error(
    `Expected a deterministic initial_commerce migration, found ${migrationFile ?? "none"}.`,
  );
}

const migrationSql = await readFile(`${migrationDirectory}/${migrationFile}`, "utf8");
const bannerMigrationSql = await readFile(`${migrationDirectory}/${bannerMigrationFile}`, "utf8");
const allMigrationSql = `${migrationSql}\n--> statement-breakpoint\n${bannerMigrationSql}`;
const requiredFragments = [
  'CREATE TABLE "users"',
  'CREATE TABLE "inventory_reservations"',
  'CREATE TABLE "email_outbox"',
  'CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()',
  'CREATE OR REPLACE FUNCTION "public"."is_admin"()',
  'CREATE OR REPLACE FUNCTION "public"."next_order_number"()',
  'ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY',
  'CREATE INDEX "products_search_fts_idx"',
  "'product-images'",
  "5242880",
  "ARRAY['image/jpeg', 'image/png', 'image/webp']",
  '"email_outbox"."dedupe_key"',
  '"guest_session_hash" text',
  '"orders_at_most_one_owner"',
  'BEFORE INSERT ON "public"."order_items"',
  "Privilege assertion failed: authenticated has table-wide users UPDATE",
  'CREATE TABLE "home_banners"',
  "'home-banners'",
  "41943040",
  "home_banners_storage_admin_insert",
];

for (const fragment of requiredFragments) {
  if (!allMigrationSql.includes(fragment)) {
    throw new Error(`Migration contract is missing: ${fragment}`);
  }
}

async function expectDatabaseRejection(
  label: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch {
    return;
  }

  throw new Error(`Expected database authorization to reject: ${label}`);
}

const database = new PGlite();

try {
  await database.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;

    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      phone text,
      raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY,
      name text NOT NULL,
      public boolean NOT NULL DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text NOT NULL REFERENCES storage.buckets(id),
      name text NOT NULL
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `);

  const statements = allMigrationSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const [index, statement] of statements.entries()) {
    try {
      await database.exec(statement);
    } catch (error) {
      throw new Error(
        `Migration statement ${index + 1}/${statements.length} failed near:\n${statement.slice(0, 300)}`,
        { cause: error },
      );
    }
  }

  const tableResult = await database.query<{ count: number }>(`
    SELECT count(*)::integer AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY (ARRAY[
        'addresses',
        'brands',
        'cart_items',
        'carts',
        'categories',
        'coupon_redemptions',
        'coupons',
        'email_outbox',
        'inventory_reservations',
        'home_banners',
        'newsletter_subscriptions',
        'order_items',
        'order_status_history',
        'orders',
        'payment_events',
        'product_images',
        'product_variants',
        'products',
        'refunds',
        'reviews',
        'settings',
        'users',
        'wishlists'
      ])
  `);

  if (tableResult.rows[0]?.count !== 23) {
    throw new Error(`Expected 23 commerce tables, found ${tableResult.rows[0]?.count ?? 0}.`);
  }

  const profileId = crypto.randomUUID();
  await database.query(
    `
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ($1, 'CUSTOMER@EXAMPLE.COM', '{"full_name":"Camera Customer","role":"admin"}')
    `,
    [profileId],
  );

  const profileResult = await database.query<{
    email: string;
    full_name: string | null;
    is_active: boolean;
    role: string;
  }>(
    `
      SELECT email, full_name, is_active, role::text
      FROM public.users
      WHERE id = $1
    `,
    [profileId],
  );
  const profile = profileResult.rows[0];

  if (
    profile?.email !== "customer@example.com" ||
    profile.full_name !== "Camera Customer" ||
    profile.role !== "customer" ||
    profile.is_active !== true
  ) {
    throw new Error("Auth trigger failed to create a safe active customer profile.");
  }

  const authenticatedOrderResult = await database.query<{ id: string }>(
    `
      INSERT INTO public.orders (
        user_id,
        payment_method,
        customer_email,
        subtotal,
        total,
        shipping_address_snapshot
      )
      VALUES ($1, 'cod', 'customer@example.com', 100, 100, '{"line1":"Order archive"}')
      RETURNING id
    `,
    [profileId],
  );
  const authenticatedOrderId = authenticatedOrderResult.rows[0]?.id;

  if (authenticatedOrderId === undefined) {
    throw new Error("Failed to create the authenticated order deletion fixture.");
  }

  await database.query("DELETE FROM auth.users WHERE id = $1", [profileId]);

  const archivedOrderResult = await database.query<{
    guest_session_hash: string | null;
    user_id: string | null;
  }>(
    `
      SELECT user_id, guest_session_hash
      FROM public.orders
      WHERE id = $1
    `,
    [authenticatedOrderId],
  );
  const archivedOrder = archivedOrderResult.rows[0];

  if (
    archivedOrder === undefined ||
    archivedOrder.user_id !== null ||
    archivedOrder.guest_session_hash !== null
  ) {
    throw new Error("Deleting an Auth user did not preserve and anonymize the order.");
  }

  const categoryId = crypto.randomUUID();
  const brandId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const guestOrderId = crypto.randomUUID();
  const orderItemId = crypto.randomUUID();

  await database.query(
    `
      INSERT INTO public.categories (id, name, slug)
      VALUES ($1, 'Deletion Regression Cameras', 'deletion-regression-cameras')
    `,
    [categoryId],
  );
  await database.query(
    `
      INSERT INTO public.brands (id, name, slug)
      VALUES ($1, 'Deletion Regression Brand', 'deletion-regression-brand')
    `,
    [brandId],
  );
  await database.query(
    `
      INSERT INTO public.products (
        id,
        name,
        slug,
        category_id,
        brand_id,
        sku,
        mrp,
        sale_price,
        stock
      )
      VALUES (
        $1,
        'Deletion Regression Camera',
        'deletion-regression-camera',
        $2,
        $3,
        'DELETE-REGRESSION-PRODUCT',
        100,
        100,
        1
      )
    `,
    [productId, categoryId, brandId],
  );
  await database.query(
    `
      INSERT INTO public.product_variants (
        id,
        product_id,
        name,
        value,
        sku,
        additional_price,
        stock
      )
      VALUES ($1, $2, 'Colour', 'Black', 'DELETE-REGRESSION-VARIANT', 0, 1)
    `,
    [variantId, productId],
  );
  await database.query(
    `
      INSERT INTO public.orders (
        id,
        guest_session_hash,
        payment_method,
        customer_email,
        subtotal,
        total,
        shipping_address_snapshot
      )
      VALUES ($1, $2, 'cod', 'guest@example.com', 100, 100, '{"line1":"Order archive"}')
    `,
    [guestOrderId, "a".repeat(64)],
  );
  await database.query(
    `
      INSERT INTO public.order_items (
        id,
        order_id,
        product_id,
        variant_id,
        product_name,
        variant_label,
        sku,
        quantity,
        unit_price,
        total
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'Deletion Regression Camera',
        'Colour: Black',
        'DELETE-REGRESSION-VARIANT',
        1,
        100,
        100
      )
    `,
    [orderItemId, guestOrderId, productId, variantId],
  );

  await database.query("DELETE FROM public.products WHERE id = $1", [productId]);

  const archivedItemResult = await database.query<{
    product_id: string | null;
    variant_id: string | null;
  }>(
    `
      SELECT product_id, variant_id
      FROM public.order_items
      WHERE id = $1
    `,
    [orderItemId],
  );
  const archivedItem = archivedItemResult.rows[0];

  if (
    archivedItem === undefined ||
    archivedItem.product_id !== null ||
    archivedItem.variant_id !== null
  ) {
    throw new Error("Deleting a product did not preserve and detach its order item snapshot.");
  }

  await database.exec(`
    UPDATE public.settings
    SET updated_at = '2000-01-01T00:00:00Z';
    UPDATE public.settings
    SET label = label
    WHERE key = 'store.profile';
  `);
  const timestampResult = await database.query<{ maintained: boolean }>(`
    SELECT updated_at > '2000-01-01T00:00:00Z'::timestamptz AS maintained
    FROM public.settings
    WHERE key = 'store.profile'
  `);

  if (timestampResult.rows[0]?.maintained !== true) {
    throw new Error("updated_at trigger did not maintain the timestamp.");
  }

  const contractResult = await database.query<{
    bucket_ok: boolean;
    default_ok: boolean;
    rls_count: number;
    settings_count: number;
  }>(`
    SELECT
      (
        SELECT public
          AND file_size_limit = 5242880
          AND cardinality(allowed_mime_types) = 3
        FROM storage.buckets
        WHERE id = 'product-images'
      ) AS bucket_ok,
      (
        SELECT column_default LIKE '%next_order_number%'
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'orders'
          AND column_name = 'order_number'
      ) AS default_ok,
      (
        SELECT count(*)::integer
        FROM pg_class AS class
        JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
        WHERE namespace.nspname = 'public'
          AND class.relrowsecurity = true
          AND class.relname = ANY (ARRAY[
            'addresses', 'brands', 'cart_items', 'carts', 'categories',
            'coupon_redemptions', 'coupons', 'email_outbox',
            'inventory_reservations', 'newsletter_subscriptions', 'order_items',
            'order_status_history', 'orders', 'payment_events', 'product_images',
            'product_variants', 'products', 'refunds', 'reviews', 'settings',
            'users', 'wishlists'
          ])
      ) AS rls_count,
      (SELECT count(*)::integer FROM public.settings) AS settings_count
  `);
  const contract = contractResult.rows[0];

  if (
    contract?.bucket_ok !== true ||
    contract.default_ok !== true ||
    contract.rls_count !== 22 ||
    contract.settings_count !== 6
  ) {
    throw new Error(`Post-migration contract assertion failed: ${JSON.stringify(contract)}`);
  }

  const rlsCustomerId = crypto.randomUUID();
  const rlsOtherCustomerId = crypto.randomUUID();
  const rlsAdminId = crypto.randomUUID();
  const rlsActiveBrandId = crypto.randomUUID();
  const rlsInactiveBrandId = crypto.randomUUID();

  await database.query(
    `
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES
        ($1, 'rls-customer@example.com', '{"full_name":"RLS Customer"}'),
        ($2, 'rls-other@example.com', '{"full_name":"RLS Other"}'),
        ($3, 'rls-admin@example.com', '{"full_name":"RLS Admin"}')
    `,
    [rlsCustomerId, rlsOtherCustomerId, rlsAdminId],
  );
  await database.query(`UPDATE public.users SET role = 'admin' WHERE id = $1`, [rlsAdminId]);
  await database.query(
    `
      INSERT INTO public.brands (id, name, slug, is_active)
      VALUES
        ($1, 'RLS Active Brand', 'rls-active-brand', true),
        ($2, 'RLS Inactive Brand', 'rls-inactive-brand', false)
    `,
    [rlsActiveBrandId, rlsInactiveBrandId],
  );
  await database.query(
    `
      INSERT INTO public.addresses (
        user_id,
        label,
        line1,
        city,
        state,
        pincode,
        country
      )
      VALUES
        ($1, 'Home', 'Customer address', 'Kochi', 'Kerala', '682001', 'India'),
        ($2, 'Home', 'Other address', 'Kochi', 'Kerala', '682002', 'India')
    `,
    [rlsCustomerId, rlsOtherCustomerId],
  );

  await database.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [rlsCustomerId]);
  await database.exec("SET ROLE authenticated");
  try {
    const customerProfileResult = await database.query<{ id: string }>(
      `
        SELECT id
        FROM public.users
        WHERE id IN ($1, $2, $3)
      `,
      [rlsCustomerId, rlsOtherCustomerId, rlsAdminId],
    );
    const customerBrandResult = await database.query<{ id: string }>(
      `
        SELECT id
        FROM public.brands
        WHERE id IN ($1, $2)
      `,
      [rlsActiveBrandId, rlsInactiveBrandId],
    );
    const customerAddressResult = await database.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM public.addresses
        WHERE user_id IN ($1, $2)
      `,
      [rlsCustomerId, rlsOtherCustomerId],
    );
    const customerHelperResult = await database.query<{
      active: boolean;
      admin: boolean;
    }>(`
      SELECT public.is_active_user() AS active, public.is_admin() AS admin
    `);

    if (
      customerProfileResult.rows.length !== 1 ||
      customerProfileResult.rows[0]?.id !== rlsCustomerId ||
      customerBrandResult.rows.length !== 1 ||
      customerBrandResult.rows[0]?.id !== rlsActiveBrandId ||
      customerAddressResult.rows.length !== 1 ||
      customerAddressResult.rows[0]?.user_id !== rlsCustomerId ||
      customerHelperResult.rows[0]?.active !== true ||
      customerHelperResult.rows[0]?.admin !== false
    ) {
      throw new Error("Authenticated customer RLS visibility contract failed.");
    }

    await expectDatabaseRejection("customer role escalation", () =>
      database.query(`UPDATE public.users SET role = 'admin' WHERE id = $1`, [rlsCustomerId]),
    );
    await expectDatabaseRejection("customer writing another user's address", () =>
      database.query(
        `
          INSERT INTO public.addresses (
            user_id,
            label,
            line1,
            city,
            state,
            pincode,
            country
          )
          VALUES ($1, 'Work', 'Forbidden address', 'Kochi', 'Kerala', '682003', 'India')
        `,
        [rlsOtherCustomerId],
      ),
    );
  } finally {
    await database.exec("RESET ROLE");
  }

  await database.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [rlsAdminId]);
  await database.exec("SET ROLE authenticated");
  try {
    const adminVisibilityResult = await database.query<{
      admin: boolean;
      brand_count: number;
      user_count: number;
    }>(
      `
        SELECT
          public.is_admin() AS admin,
          (
            SELECT count(*)::integer
            FROM public.users
            WHERE id IN ($1, $2, $3)
          ) AS user_count,
          (
            SELECT count(*)::integer
            FROM public.brands
            WHERE id IN ($4, $5)
          ) AS brand_count
      `,
      [rlsCustomerId, rlsOtherCustomerId, rlsAdminId, rlsActiveBrandId, rlsInactiveBrandId],
    );
    const adminVisibility = adminVisibilityResult.rows[0];

    if (
      adminVisibility?.admin !== true ||
      adminVisibility.user_count !== 3 ||
      adminVisibility.brand_count !== 2
    ) {
      throw new Error("Authenticated administrator RLS visibility contract failed.");
    }

    await expectDatabaseRejection("browser-token administrator promotion", () =>
      database.query(`UPDATE public.users SET role = 'admin' WHERE id = $1`, [rlsOtherCustomerId]),
    );
  } finally {
    await database.exec("RESET ROLE");
  }

  await database.exec("SET ROLE anon");
  try {
    const publicBrandResult = await database.query<{ id: string }>(
      `
        SELECT id
        FROM public.brands
        WHERE id IN ($1, $2)
      `,
      [rlsActiveBrandId, rlsInactiveBrandId],
    );
    if (publicBrandResult.rows.length !== 1 || publicBrandResult.rows[0]?.id !== rlsActiveBrandId) {
      throw new Error("Anonymous catalog RLS visibility contract failed.");
    }

    await expectDatabaseRejection("anonymous profile reads", () =>
      database.query(`SELECT id FROM public.users LIMIT 1`),
    );
    await database.query(
      `
        INSERT INTO public.newsletter_subscriptions (email, full_name)
        VALUES ('rls-newsletter@example.com', 'RLS Subscriber')
      `,
    );
    await expectDatabaseRejection("anonymous newsletter reads", () =>
      database.query(
        `SELECT email FROM public.newsletter_subscriptions WHERE email = 'rls-newsletter@example.com'`,
      ),
    );
  } finally {
    await database.exec("RESET ROLE");
  }

  const newsletterResult = await database.query<{ count: number }>(`
    SELECT count(*)::integer AS count
    FROM public.newsletter_subscriptions
    WHERE email = 'rls-newsletter@example.com'
      AND is_active = true
      AND source = 'storefront'
  `);
  if (newsletterResult.rows[0]?.count !== 1) {
    throw new Error("Anonymous newsletter insert contract failed.");
  }

  console.log(
    `Validated ${migrationFile}: ${statements.length} statements, 22 RLS tables, role behavior verified.`,
  );
} finally {
  await database.close();
}
