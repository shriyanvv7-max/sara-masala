import { NextResponse } from "next/server";
import { z } from "zod";
import { getRazorpay, getRazorpayConfig } from "../../../../../lib/razorpay";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { validSignature, paymentError } from "../../../../../lib/payment-security";
import { sendPaidOrderEmails } from "../../../../../lib/order-notifications";
export const runtime = "nodejs";
const schema = z.object({ internalOrderId: z.string().uuid(), razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return paymentError(400, "Invalid payment response.");
  try {
    const input = parsed.data; const { keySecret } = getRazorpayConfig(); const db = supabaseAdmin();
    const { data: order, error } = await db.from("orders").select("*").eq("id", input.internalOrderId).single();
    if (error || !order || order.razorpay_order_id !== input.razorpay_order_id || !validSignature(`${order.razorpay_order_id}|${input.razorpay_payment_id}`, input.razorpay_signature, keySecret)) return paymentError(400, "Payment verification failed.");
    const payment = await getRazorpay().payments.fetch(input.razorpay_payment_id);
    if (payment.order_id !== order.razorpay_order_id || payment.currency !== "INR" || Number(payment.amount) !== Math.round(Number(order.total) * 100) || payment.status !== "captured") return paymentError(409, "Payment is not yet captured. Retry verification shortly.");
    const { error: confirmError } = await db.rpc("confirm_razorpay_payment", { p_order_id: order.id, p_razorpay_order_id: order.razorpay_order_id, p_payment_id: payment.id, p_signature: input.razorpay_signature });
    if (confirmError) return paymentError(409, "Payment received but order confirmation needs review. Keep your payment reference and contact us; do not pay again.");
    const { data: confirmedOrder, error: confirmedOrderError } = await db.from("orders").select("status").eq("id", order.id).single();
    if (confirmedOrderError) return paymentError(409, "Payment received but order confirmation needs review. Keep your payment reference and contact us; do not pay again.");
    if (confirmedOrder.status === "payment_review") return paymentError(409, "Payment was captured after this checkout expired. Do not pay again. Please contact support for review or refund.");
    await sendPaidOrderEmails(order.id);
    return NextResponse.json({ orderNumber: order.order_number, confirmationToken: order.confirmation_token });
  } catch { console.error("[payment:verify] Provider or database verification failed"); return paymentError(); }
}
