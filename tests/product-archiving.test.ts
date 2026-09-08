import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("migration adds a non-null archived flag defaulting to false", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.match(sql, /archived boolean not null default false/i);
});

test("public RLS excludes archived products", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.match(sql, /create policy "Public product read"[\s\S]+using \(archived = false\)/i);
});

test("archiving disables variants without deleting products, variants, or order items", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.match(sql, /if p_archived then[\s\S]+update public\.product_variants[\s\S]+set active = false/i);
  assert.doesNotMatch(sql, /delete from public\.(products|product_variants|order_items)/i);
});

test("restore does not automatically reactivate variants", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.doesNotMatch(sql, /set active = (?:p_archived = false|true)/i);
});

test("archive RPC is restricted to authenticated admins", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.match(sql, /if not public\.is_admin\(\)/i);
  assert.match(sql, /revoke all on function public\.set_product_archived\(uuid, boolean\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.set_product_archived\(uuid, boolean\) to authenticated/i);
});

test("QA Test Product is archived by the migration", async () => {
  const sql = await readFile("supabase/migrations/010_product_archiving.sql", "utf8");
  assert.match(sql, /where slug = 'qa-test-product'/i);
});

test("all public product reads and sitemap exclude archived products", async () => {
  const [products, sitemap] = await Promise.all([readFile("lib/products.ts", "utf8"), readFile("app/sitemap.ts", "utf8")]);
  assert.match(products, /\.eq\("archived", false\)/);
  assert.match(sitemap, /getProducts\(\)/);
  assert.match(sitemap, /product\.variants\.length > 0/);
});

test("hard deletion detects order history and returns a clear conflict", async () => {
  const source = await readFile("app/api/products/[id]/route.ts", "utf8");
  assert.match(source, /\.from\("order_items"\)/);
  assert.match(source, /PRODUCT_HAS_ORDER_HISTORY/);
  assert.match(source, /status: 409/);
  assert.match(source, /This product has order history and cannot be permanently deleted\./);
});

test("admin offers archived filtering, archive messaging, and restoration", async () => {
  const [listing, form] = await Promise.all([readFile("app/admin/products/page.tsx", "utf8"), readFile("components/admin/product-form.tsx", "utf8")]);
  assert.match(listing, /\["Archived", "archived"\]/);
  assert.match(form, /This product has order history and cannot be permanently deleted\./);
  assert.match(form, /Archive product/);
  assert.match(form, /Restore product/);
  assert.match(form, /> Active</);
});
