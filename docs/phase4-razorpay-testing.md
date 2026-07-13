# Razorpay Test Mode setup

1. Apply `supabase/migrations/003_phase4_payments.sql` in the Supabase SQL editor after migrations 001 and 002.
2. In Razorpay Dashboard, keep **Test Mode** selected. Create API keys and set the four Razorpay variables in `.env.local`.
3. Add a webhook with URL `https://your-domain.com/api/webhooks/razorpay`, set its secret to `RAZORPAY_WEBHOOK_SECRET`, and enable `payment.captured`, `order.paid`, `payment.failed`, and `refund.processed`.
4. Configure Supabase Storage bucket `product-images` as described by migration 001. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` to the browser.

## Test checklist

- Successful test payment creates a paid/confirmed order and deducts stock once.
- Failed payment leaves stock unchanged and records a failed order state.
- Checkout dismissal leaves the cart intact.
- Invalid signature is rejected without updating an order.
- Repeating the verification request does not deduct stock twice.
- Replaying a webhook event ID succeeds without processing twice.
- A captured webhook confirms an order when the browser callback is missed.
- Insufficient stock rejects checkout; test two users purchasing the final item.
- Changing price, deleting a variant, or making it inactive after cart addition is detected server-side.
- Confirm admin order detail access and status-management rules before enabling live mode.
- Verify the cart clears only after `/verify` returns success.
