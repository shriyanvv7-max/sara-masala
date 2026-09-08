import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutSchema } from "../../../../../lib/validations";
import { calculateShipping } from "../../../../../lib/commerce";
import { getRazorpay, getRazorpayConfig } from "../../../../../lib/razorpay";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { paymentError } from "../../../../../lib/payment-security";
import { canReusePendingOrder, isPendingOrderExpired } from "../../../../../lib/order-lifecycle";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = checkoutSchema.extend({ requestId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return paymentError(400, "Please check your checkout details and cart.");
  const input = parsed.data;
  if (new Set(input.items.map(i => i.variant_id)).size !== input.items.length || input.items.length > 100) return paymentError(400, "Please refresh your cart.");
  if (input.coupon_code) return paymentError(400, "This coupon is unavailable.");
  try {
    const config = getRazorpayConfig(); const razorpay = getRazorpay(); const db = supabaseAdmin();
    const fingerprint = createHash("sha256").update(JSON.stringify({ ...input, requestId: undefined })).digest("hex");
    const { data: existing, error: lookupError } = await db.from("orders").select("*").eq("checkout_request_id", input.requestId).maybeSingle();
    if (lookupError) throw lookupError;
    const response = (o: any) => NextResponse.json({ internalOrderId: o.id, orderNumber: o.order_number, confirmationToken: o.confirmation_token, razorpayOrderId: o.razorpay_order_id, expiresAt: o.expires_at, amount: Math.round(Number(o.total) * 100), currency: "INR", key: config.keyId, testMode: config.keyId.startsWith("rzp_test_"), customer: input.customer });
    if (existing) {
      if (existing.checkout_fingerprint !== fingerprint) return paymentError(409, "Checkout details changed. Please start a new checkout.");
      if (isPendingOrderExpired(existing)) {
        await db.from("orders").update({ payment_status: "expired", status: "abandoned", updated_at: new Date().toISOString() }).eq("id", existing.id).eq("payment_status", "pending");
        return NextResponse.json({ error: "This payment session expired. A new payment session is required.", code: "ORDER_EXPIRED" }, { status: 409 });
      }
      if (!canReusePendingOrder(existing, fingerprint)) return paymentError(409, "This checkout can no longer be paid. Please start again.");
      if (existing.razorpay_order_id) return response(existing);
      return paymentError(409, "Your payment request is being prepared. Retry shortly; do not create a second payment.");
    }
    const { data: compatible, error: compatibleError } = await db.from("orders").select("*").eq("checkout_fingerprint", fingerprint).eq("payment_status", "pending").eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (compatibleError) throw compatibleError;
    if (compatible) return compatible.razorpay_order_id ? response(compatible) : paymentError(409, "Your payment request is being prepared. Retry shortly; do not create a second payment.");
    const { data: variants, error } = await db.from("product_variants").select("id,price,stock,active").in("id", input.items.map(i => i.variant_id));
    if (error) throw error;
    let subtotalPaise = 0;
    for (const item of input.items) {
      const v = variants?.find(v => v.id === item.variant_id);
      if (!v?.active || v.stock < item.quantity) return paymentError(409, "A product is unavailable or has insufficient stock. Please review your cart.");
      subtotalPaise += Math.round(Number(v.price) * 100) * item.quantity;
    }
    const shipping = calculateShipping(subtotalPaise / 100);
    const { data: order, error: prepareError } = await db.rpc("prepare_razorpay_order", { p_request_id: input.requestId, p_fingerprint: fingerprint, p_customer: input.customer, p_address: input.address, p_items: input.items, p_shipping: shipping, p_expected_subtotal: subtotalPaise / 100 });
    if (prepareError) {
      if (prepareError.code === "23505") {
        const { data: concurrent } = await db.from("orders").select("*").eq("checkout_fingerprint", fingerprint).eq("payment_status", "pending").eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (concurrent?.razorpay_order_id) return response(concurrent);
        if (concurrent) return paymentError(409, "Your payment request is being prepared. Retry shortly; do not create a second payment.");
      }
      console.error("[payment:create] prepare_razorpay_order failed", {
        code: prepareError.code,
        message: prepareError.message,
        details: prepareError.details,
        hint: prepareError.hint,
      });

      return paymentError(409, "Prices or availability changed. Please refresh your cart and retry.");
    }
    const remote = await razorpay.orders.create({ amount: Math.round(Number(order.total) * 100), currency: "INR", receipt: order.order_number, notes: { internal_order_id: order.id, expires_at: order.expires_at } });
    const { error: saveError } = await db.from("orders").update({ razorpay_order_id: remote.id }).eq("id", order.id);
    if (saveError) throw saveError;
    return response({ ...order, razorpay_order_id: remote.id });
  } catch { console.error("[payment:create] Configuration, database or provider failure"); return paymentError(); }
}
