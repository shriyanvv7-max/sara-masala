# Post-payment setup and verification

## Database

Apply migrations through `009_pending_order_lifecycle.sql` to the production Supabase project. Migration 008 creates the protected `order_email_events` delivery ledger; migration 009 adds 30-minute checkout expiry, abandoned/payment-review states, duplicate-pending-order protection, and the cleanup RPC.

## Resend

1. Create a Resend account and verify the sending domain.
2. Create a production API key with send-email permission.
3. Configure `RESEND_API_KEY` only in the server environment (local `.env.local` and Vercel encrypted environment variables).
4. Set `EMAIL_FROM` to a sender on the verified domain, for example `Sara Masala <orders@saramasala.in>`.
5. Set `ADMIN_ORDER_EMAIL` to the mailbox that should receive new paid-order notices.
6. Set `SITE_URL` to the canonical HTTPS storefront URL so email links point to production.
7. Redeploy after changing Vercel environment variables.

Never prefix the Resend key with `NEXT_PUBLIC_` or commit it to Git.

## Invoice configuration

The PDF intentionally does not invent legal or tax information. Configure these when the business supplies them:

- `INVOICE_ISSUER_NAME`: verified invoicing/legal issuer name.
- `INVOICE_ISSUER_ADDRESS`: verified invoice address.
- `INVOICE_TAX_REGISTRATION`: verified tax registration text, if applicable.
- `INVOICE_TAX_NOTE`: approved tax wording/rate summary.

Until configured, the invoice visibly marks these details as “To be supplied” and does not state a GSTIN, GST rate, HSN code, or legal company name.

## Complete test checklist

- [ ] Successful captured test payment returns the confirmation page even if Resend is unavailable.
- [ ] Customer receives one confirmation containing order lines, weights, quantities, totals, address, payment status, delivery expectation, and token-protected tracking link.
- [ ] Configured admin receives one new-paid-order notice with customer, phone, items, address, total, and protected admin link.
- [ ] Saving `packed` sends one packed email.
- [ ] Saving `shipped` sends one shipped email.
- [ ] Saving `out_for_delivery` sends one out-for-delivery email.
- [ ] Saving `delivered` sends one delivered email.
- [ ] Saving `cancelled` sends one cancellation email.
- [ ] Saving the same status twice creates no second sent delivery record.
- [ ] A failed delivery is recorded as `failed`, logs a server-side error, and can be retried from the admin order page.
- [ ] Send/re-send confirmation works for paid orders and creates a provider response ID.
- [ ] A processed refund sends one email with the exact refund amount and Razorpay refund ID.
- [ ] A duplicate refund webhook sends no duplicate refund email.
- [ ] Customer invoice download succeeds with the valid confirmation token.
- [ ] Customer invoice download fails with no token, malformed token, or another order's token.
- [ ] Authenticated order owner can download their invoice when `customer_id` is populated.
- [ ] Admin can download and open the printable invoice without a guest token.
- [ ] Unpaid orders cannot generate invoices.
- [ ] Generated PDF contains the logo, identifiers, date, customer/address, lines, totals, payment ID/method, and only configured legal/tax data.
- [ ] Copy phone and copy address work over HTTPS.
- [ ] Run `node --import tsx --test tests/post-payment.test.ts`.
- [ ] Run `node --test tests/payment-security.test.cjs`.
- [ ] Run `npm run test:order-lifecycle`.
- [ ] Run `npm run build`.
