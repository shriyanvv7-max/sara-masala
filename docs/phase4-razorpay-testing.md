# Razorpay deployment and test guide

## Changed files

Created:
- `lib/payment-security.ts`
- `app/api/admin/orders/[id]/route.ts`
- `app/api/admin/orders/[id]/refund/route.ts`
- `components/admin/order-status.tsx`
- `supabase/migrations/006_razorpay_hardening.sql`
- `tests/payment-security.test.cjs`

Updated/restored:
- `app/api/payments/razorpay/create-order/route.ts`
- `app/api/payments/razorpay/verify/route.ts`
- `app/api/webhooks/razorpay/route.ts`
- `components/checkout/checkout-form.tsx`
- `components/checkout/razorpay-checkout.tsx`
- `app/order-confirmation/[orderNumber]/page.tsx`
- `app/admin/orders/[id]/page.tsx`
- `lib/razorpay.ts`, `lib/supabase/admin.ts`, `lib/commerce.ts`, `lib/email.ts`
- `supabase/migrations/003_phase4_payments.sql`
- `.env.example`, this guide

## Configuration

Set in `.env.local` and Vercel project environment variables (Preview and Production as appropriate):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server only
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` — identical `rzp_test_...` values
- `RAZORPAY_KEY_SECRET` — server only, from the same test key pair
- `RAZORPAY_WEBHOOK_SECRET` — server only, identical to the dashboard webhook secret
- `SHIPPING_FEE_INR=60`, `FREE_SHIPPING_THRESHOLD_INR=799` (optional overrides)
- `RAZORPAY_ALLOW_LIVE=false`. Live keys are rejected unless explicitly changed to `true`.

Never commit `.env.local`. Restart Next.js after local environment changes; redeploy Vercel after environment changes. This implementation does not switch the dashboard into Live Mode. No credentials were generated or configured by this change.

## Supabase

Apply migrations 001, 002 and 003 if not already applied, then 004/005 as applicable and **006_razorpay_hardening.sql**. Do not rerun the catalogue migrations blindly. For existing Phase 4 installations, apply 006 directly. It replaces the finalizer, grants RPC execution exclusively to service_role, removes direct authenticated order writes, and adds checkout/refund tracking. It leaves admin catalogue management intact.

Check that `reduce_inventory` no longer exists on order_items. Inventory must be deducted only by the finalizer. UNIQUE constraints index order_number, razorpay_order_id, razorpay_payment_id; 006 adds status/created_at indexes.

The finalizer locks the order then variants in UUID order and deducts grouped quantities in a single transaction. Failure rolls back every deduction. Stock is checked at checkout and again at capture. This prevents overselling but does not reserve stock: a captured payment can require manual refund if another buyer took the final unit. Monitor unprocessed payment_events and captured payments whose local order remains unpaid.

## Razorpay Dashboard

Use Test Mode keys and automatic payment capture. Add an HTTPS webhook:

`https://<your-production-domain>/api/webhooks/razorpay`

Enable `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`. Use the same webhook secret in Vercel. Localhost cannot receive Razorpay webhooks without a public tunnel. Use a test deployment for webhook tests. Ensure Vercel deployment protection does not block the webhook route.

## Exact test sequence

Use disposable test products/stock and Razorpay's current Test Mode payment methods. Do not use a real payment.

1. Run `node --test tests/payment-security.test.cjs` and `npm.cmd run build`, then start localhost or deploy the test environment.
2. Add a variant; fill all checkout details; verify server total includes configured shipping. Enter invalid phone, email and PIN first and confirm inline errors.
3. Double-click Continue: one internal order and one Razorpay order. Replay the same requestId: same order response (or 409 while preparing). Changed details with the same key must be rejected.
4. Successful test capture: `/verify` succeeds, cart clears, confirmation displays item weights/quantities/unit prices/subtotal/shipping/discount/total/address, and admin shows paid/confirmed with IDs and paid time.
5. Replay the signed verification request: same result, inventory unchanged. Wrong signature/order/payment ID: 400, no mutation. An authorized but uncaptured payment: 409, no stock change.
6. Close checkout: cart persists and payment may be retried. Fail a test payment: no inventory deduction. Retry successfully on the same Razorpay order.
7. Disable connectivity after capture: cart persists, Retry payment verification does not open a second payment. Restore connectivity and verify; cart clears only after success.
8. Drop browser callback: captured webhook must confirm independently. Refresh confirmation: read only, no duplicate deduction.
9. Replay webhook with same x-razorpay-event-id: success with no duplicate deduction. Corrupt raw body/signature: 400. Force DB failure, then restore and replay: event remains unprocessed until successful transaction.
10. Send payment.failed after payment.captured: paid state must remain paid. Retry the captured event after a refund: must not reset refunded state.
11. Change variant price after adding to cart: checkout uses database price. Delete/deactivate a cart product: checkout rejects it. Change price during preparation: transaction rejects stale subtotal.
12. Set stock to zero: reject before provider order creation. For the last unit, run two separate checkouts concurrently: only one finalization deducts stock; the other remains reviewable and must be refunded manually if captured. No negative inventory or partial deductions.
13. As admin, update packed/shipped/out_for_delivery/delivered/cancelled. As guest or non-admin, same API returns 403. Attempts to include payment_status or totals return 400. Direct authenticated order writes are denied by database privileges.
14. Refund a disposable paid order using authenticated `POST /api/admin/orders/<uuid>/refund` with JSON `{ "reason": "Test full refund", "confirmFullRefund": true }`. Check refund ID/status in admin and processed webhook. Stock does not change. Duplicate request: 409, no second refund. Partial refunds made in Razorpay use cumulative amount_refunded to update status.
15. On refund timeout, do not clear refund_request_id and retry blindly. Reconcile the provider refund using notes.request_id/payment ID, let refund webhook recover, or manually record the confirmed outcome before considering any new request.

## Interrupted order creation

The internal request claim is durable. If Razorpay order creation times out or the returned ID cannot be saved, repeated checkout requests intentionally return 409. Search Razorpay by receipt/internal_order_id; link the existing order after verification. Do not silently create a new remote order. This conservative recovery avoids double charging; automatic cross-provider transactional recovery is not available.

## Email preparation

`lib/email.ts` provides event names and subjects for order confirmation, payment failure, packed, shipped, delivered, refunds and admin new order. It is a deliberate no-op until a provider is implemented; logs contain no recipient/customer data. Email delivery is not enabled or claimed by this integration.

## Verification limits

Build/type checks do not prove payment capture or concurrency. Run the above tests against a migrated disposable Supabase/Test Mode environment before enabling live credentials. No real refunds or charges are required during development.

References: https://razorpay.com/docs/webhooks/validate-test/ and https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/
