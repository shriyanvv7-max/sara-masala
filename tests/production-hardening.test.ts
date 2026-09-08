import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");

test("global headers constrain framing, content types, browser capabilities and Razorpay origins", async () => {
  const config = await read("next.config.ts");
  for (const expected of ["Content-Security-Policy", "frame-ancestors 'none'", "X-Content-Type-Options", "nosniff", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "checkout.razorpay.com", "*.razorpay.com"]) {
    assert.match(config, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(config, /poweredByHeader:\s*false/);
  assert.match(config, /Strict-Transport-Security/);
});

test("sensitive and transactional pages cannot be shared-cache persisted", async () => {
  const config = await read("next.config.ts");
  for (const route of ["/admin/:path*", "/checkout", "/cart", "/order-confirmation/:path*"]) assert.ok(config.includes(route));
  assert.match(config, /private, no-store, max-age=0/);
});

test("server credentials remain in server-only modules and are never public variables", async () => {
  const [admin, razorpay, email] = await Promise.all([read("lib/supabase/admin.ts"), read("lib/razorpay.ts"), read("lib/email.ts")]);
  assert.match(admin, /import "server-only"/);
  assert.match(razorpay, /import "server-only"/);
  assert.match(email, /import "server-only"/);
  for (const source of [admin, razorpay, email]) {
    assert.doesNotMatch(source, /NEXT_PUBLIC_(?:SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_KEY_SECRET|RESEND_API_KEY)/);
  }
});

test("rate limiting is atomic, private and used by payment and upload entry points", async () => {
  const [migration, limiter, createPayment, verifyPayment, upload] = await Promise.all([
    read("supabase/migrations/011_security_performance_hardening.sql"), read("lib/rate-limit.ts"),
    read("app/api/payments/razorpay/create-order/route.ts"), read("app/api/payments/razorpay/verify/route.ts"),
    read("app/api/uploads/product-image/route.ts"),
  ]);
  assert.match(migration, /primary key \(bucket, key_hash\)/i);
  assert.match(migration, /revoke all on public\.api_rate_limits from anon, authenticated/i);
  assert.match(migration, /grant execute[\s\S]+to service_role/i);
  assert.match(limiter, /status:\s*429/);
  for (const source of [createPayment, verifyPayment, upload]) assert.match(source, /await rateLimit\(/);
});

test("uploads verify file signatures, cap size, randomize names and constrain deletion paths", async () => {
  const [route, security] = await Promise.all([read("app/api/uploads/product-image/route.ts"), read("lib/product-image-security.ts")]);
  assert.match(route, /file\.size > MAX_PRODUCT_IMAGE_BYTES/);
  assert.match(route, /detectProductImageType\(bytes\)/);
  assert.match(route, /file\.type !== detectedType/);
  assert.match(route, /crypto\.randomUUID\(\)/);
  assert.match(security, /url\.hostname !== storageHost/);
  assert.match(security, /path\.includes\("\.\."\)/);
});

test("public catalogue uses a tagged cache and write routes invalidate it", async () => {
  const [products, cache, productRoute, variantRoute] = await Promise.all([
    read("lib/products.ts"), read("lib/catalog-cache.ts"), read("app/api/products/[id]/route.ts"), read("app/api/product-variants/[id]/route.ts"),
  ]);
  assert.match(products, /unstable_cache/);
  assert.match(products, /revalidate:\s*300/);
  assert.match(cache, /revalidateTag\("product-catalog"\)/);
  assert.match(productRoute, /revalidateProductCatalog\(\)/);
  assert.match(variantRoute, /revalidateProductCatalog\(\)/);
});

test("legacy direct order creation is write-free", async () => {
  const route = await read("app/api/orders/route.ts");
  assert.match(route, /status:\s*405/);
  assert.doesNotMatch(route, /\.insert\(|\.rpc\(/);
});
