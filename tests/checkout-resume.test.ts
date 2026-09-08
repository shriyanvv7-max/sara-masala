import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  CHECKOUT_DETAILS_STORAGE_KEY,
  CHECKOUT_REQUEST_STORAGE_KEY,
  canResumeBuyNowCheckout,
  clearCheckoutPaymentState,
  clearCheckoutRequest,
  createCartFingerprint,
  readCheckoutDetails,
  readCheckoutRequest,
  writeCheckoutDetails,
  writeCheckoutRequest,
  type CheckoutDetails,
  type StoredCheckoutRequest,
} from "../lib/checkout-session";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const details: CheckoutDetails = {
  customer: { name: "Sara Customer", email: "customer@example.com", phone: "9876543210" },
  address: { line1: "12 Market Road", line2: "Near the park", city: "Mysuru", state: "Karnataka", postal_code: "570001", country: "India" },
  coupon_code: "",
};
const cart = [{ variant_id: "variant-a", quantity: 2 }];
const pending: StoredCheckoutRequest = {
  id: "8ab76910-5103-4408-8b36-42f979b237b4",
  fingerprint: "checkout-hash",
  cartFingerprint: createCartFingerprint(cart),
  internalOrderId: "internal-order-1",
  razorpayOrderId: "order_razorpay_1",
  expiresAt: "2026-09-08T10:30:00.000Z",
};

test("closing Razorpay keeps a retry action and the required safe message", async () => {
  const source = await readFile("components/checkout/razorpay-checkout.tsx", "utf8");
  assert.match(source, /Payment was not completed\. You can retry securely\./);
  assert.match(source, /dismissed \? "Retry payment"/);
});

test("pending checkout identity survives leaving checkout for the shop", () => {
  const storage = new MemoryStorage(); writeCheckoutRequest(storage, pending);
  assert.deepEqual(readCheckoutRequest(storage), pending);
});

test("Buy Now resumes the pending checkout for the same retained cart and variant", () => {
  assert.equal(canResumeBuyNowCheckout(pending, cart, "variant-a"), true);
});

test("customer and delivery details remain prefilled from local storage", () => {
  const storage = new MemoryStorage(); writeCheckoutDetails(storage, details);
  assert.deepEqual(readCheckoutDetails(storage), details);
});

test("the same pending internal order is retained", () => {
  const storage = new MemoryStorage(); writeCheckoutRequest(storage, pending);
  assert.equal(readCheckoutRequest(storage)?.internalOrderId, "internal-order-1");
});

test("the same Razorpay order ID is retained", () => {
  const storage = new MemoryStorage(); writeCheckoutRequest(storage, pending);
  assert.equal(readCheckoutRequest(storage)?.razorpayOrderId, "order_razorpay_1");
});

test("refreshing checkout restores the same request ID", () => {
  const storage = new MemoryStorage(); writeCheckoutRequest(storage, pending);
  assert.equal(readCheckoutRequest(storage)?.id, pending.id);
});

test("double-click protection exists in browser, database, and RPC", async () => {
  const [form, migration] = await Promise.all([
    readFile("components/checkout/checkout-form.tsx", "utf8"),
    readFile("supabase/migrations/009_pending_order_lifecycle.sql", "utf8"),
  ]);
  assert.match(form, /if \(lock\.current\) return/);
  assert.match(migration, /unique index[^;]+checkout_fingerprint/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
});

test("a materially changed cart produces a different identity and cannot resume", () => {
  const changed = [{ variant_id: "variant-a", quantity: 3 }];
  assert.notEqual(createCartFingerprint(cart), createCartFingerprint(changed));
  assert.equal(canResumeBuyNowCheckout(pending, changed, "variant-a"), false);
});

test("expired checkout renewal clears identity but preserves customer details", () => {
  const storage = new MemoryStorage(); writeCheckoutDetails(storage, details); writeCheckoutRequest(storage, pending);
  clearCheckoutRequest(storage);
  assert.equal(storage.getItem(CHECKOUT_REQUEST_STORAGE_KEY), null);
  assert.deepEqual(readCheckoutDetails(storage), details);
});

test("verified payment clears details, request identity, and retry state", () => {
  const storage = new MemoryStorage(); writeCheckoutDetails(storage, details); writeCheckoutRequest(storage, pending);
  clearCheckoutPaymentState(storage);
  assert.equal(storage.getItem(CHECKOUT_DETAILS_STORAGE_KEY), null);
  assert.equal(storage.getItem(CHECKOUT_REQUEST_STORAGE_KEY), null);
});

test("server reuse verifies authoritative line prices, subtotal, shipping, and total", async () => {
  const source = await readFile("app/api/payments/razorpay/create-order/route.ts", "utf8");
  assert.match(source, /matchesCurrentCheckout/);
  assert.match(source, /line\?\.price/);
  assert.match(source, /order\.subtotal/);
  assert.match(source, /order\.shipping/);
  assert.match(source, /order\.total/);
});
