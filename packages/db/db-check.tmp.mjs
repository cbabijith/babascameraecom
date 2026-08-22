import postgres from "postgres";
const url = "postgresql://postgres.tiuovwpezzestnnedbdo:1%40Abijithcb.@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
const client = postgres(url, { max: 1, prepare: false, ssl: "require", idle_timeout: 5 });
try {
  const tables = await client`select table_name from information_schema.tables where table_schema='public' order by table_name`;
  console.log("TABLES:", tables.map(t => t.table_name).join(", "));
  const cols = await client`select column_name from information_schema.columns where table_schema='public' and table_name='users' order by ordinal_position`;
  console.log("USERS COLS:", cols.map(c => c.column_name).join(", "));
  const users = await client`select id, email, role, is_active, email_verified from users order by created_at limit 10`;
  console.log("USERS:", JSON.stringify(users, null, 1));
  const counts = await client`select
    (select count(*) from products) as products,
    (select count(*) from orders) as orders,
    (select count(*) from categories) as categories,
    (select count(*) from brands) as brands,
    (select count(*) from home_banners) as banners,
    (select count(*) from sessions) as sessions,
    (select count(*) from accounts) as accounts`;
  console.log("COUNTS:", JSON.stringify(counts[0]));
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await client.end({ timeout: 5 });
}
