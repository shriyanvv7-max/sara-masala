import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PENDING_ORDER_TTL_MS, adminPaymentLabel, canFulfilOrder, canReusePendingOrder, isPendingOrderExpired } from "../lib/order-lifecycle";

const created = new Date("2026-09-08T10:00:00.000Z");
const pending = { status: "pending", payment_status: "pending", checkout_fingerprint: "same-cart", expires_at: new Date(created.getTime() + PENDING_ORDER_TTL_MS).toISOString() };

test("closing the Razorpay popup leaves the compatible pending order reusable", () => assert.equal(canReusePendingOrder(pending, "same-cart", new Date(created.getTime() + 5 * 60_000)), true));
test("retry within the valid window reuses the same checkout fingerprint", () => { assert.equal(canReusePendingOrder(pending, "same-cart", new Date(created.getTime() + 29 * 60_000)), true); assert.equal(canReusePendingOrder(pending, "different-cart", new Date(created.getTime() + 29 * 60_000)), false); });
test("the pending order expires at the 30 minute boundary", () => { assert.equal(isPendingOrderExpired(pending, new Date(created.getTime() + PENDING_ORDER_TTL_MS - 1)), false); assert.equal(isPendingOrderExpired(pending, new Date(created.getTime() + PENDING_ORDER_TTL_MS)), true); });
test("expired and abandoned orders cannot be fulfilled", () => { assert.equal(canFulfilOrder({ ...pending, payment_status: "expired", status: "abandoned" }, created), false); assert.equal(adminPaymentLabel({ ...pending, payment_status: "expired", status: "abandoned" }, created), "Abandoned"); });
test("late captured payments are flagged for review and cannot be fulfilled", () => { const review = { ...pending, payment_status: "paid", status: "payment_review" }; assert.equal(adminPaymentLabel(review, created), "Payment review"); assert.equal(canFulfilOrder(review, created), false); });
test("a normal paid confirmed order remains fulfillable", () => assert.equal(canFulfilOrder({ status: "confirmed", payment_status: "paid" }, created), true));
test("migration enforces one active pending order per checkout fingerprint", async () => { const sql = await readFile("supabase/migrations/009_pending_order_lifecycle.sql", "utf8"); assert.match(sql, /unique index[^;]+checkout_fingerprint[^;]+payment_status='pending'/i); });
test("late captured payment is persisted for review rather than discarded", async () => { const sql = await readFile("supabase/migrations/009_pending_order_lifecycle.sql", "utf8"); assert.match(sql, /payment_status='paid',status='payment_review'/); assert.match(sql, /Payment captured after checkout expiry/); });
test("closing the Razorpay popup explicitly preserves the cart and unlocks retry", async () => { const source = await readFile("components/checkout/razorpay-checkout.tsx", "utf8"); assert.match(source, /modal:\s*\{\s*ondismiss:/); assert.match(source, /Payment was not completed\. You can retry securely\./); assert.match(source, /lock\.current = false/); });
