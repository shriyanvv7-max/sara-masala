import { randomUUID } from "crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { paymentAdmin, paymentError } from "../../../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../../../lib/supabase/admin";
import { getRazorpay } from "../../../../../../lib/razorpay";
import { sendRefundEmail } from "../../../../../../lib/order-notifications";
import { rateLimit } from "../../../../../../lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await paymentAdmin(); if (!admin) return paymentError(403, "Admin access required.");
  const limited = await rateLimit(request, { bucket: "admin-refund", limit: 10, windowSeconds: 3600, identity: admin.id });
  if (limited) return limited;
  const input = z.object({ reason: z.string().trim().min(5).max(500), confirmFullRefund: z.literal(true) }).strict().safeParse(await request.json().catch(() => null));
  const id = z.string().uuid().safeParse((await params).id);
  if (!input.success || !id.success) return paymentError(400, "Confirm the full refund and provide a reason.");
  try {
    const razorpay = getRazorpay(); const db = supabaseAdmin();
    const { data: order, error } = await db.from("orders").update({ refund_request_id: randomUUID(), refund_status: "requested", refund_requested_by: admin.id, refund_reason: input.data.reason }).eq("id", id.data).eq("payment_status", "paid").is("refund_request_id", null).select("*").maybeSingle();
    if (error || !order) return paymentError(409, "Refund already requested or order is not eligible. Check its existing refund before retrying.");
    const payment = await razorpay.payments.fetch(order.razorpay_payment_id);
    if (payment.status !== "captured" || payment.order_id !== order.razorpay_order_id || payment.currency !== "INR" || Number(payment.amount) !== Math.round(Number(order.total) * 100) || Number(payment.amount_refunded) > 0) throw new Error("Refund requires reconciliation");
    // A durable claim prevents duplicate API calls, including after a timeout.
    const refund = await razorpay.payments.refund(order.razorpay_payment_id, { amount: Math.round(Number(order.total) * 100), notes: { internal_order_id: order.id, request_id: order.refund_request_id } });
    const { error: saveError } = await db.from("orders").update({ razorpay_refund_id: refund.id, refund_status: refund.status }).eq("id", order.id).neq("refund_status", "processed");
    if (saveError) throw saveError;
    if (refund.status === "processed") await sendRefundEmail(order.id, refund.id, Number(refund.amount));
    return NextResponse.json({ refundId: refund.id, status: refund.status });
  } catch { console.error("[payment:refund] Requires reconciliation before any retry"); return paymentError(502, "Refund outcome needs review. Check Razorpay before attempting another refund."); }
}
