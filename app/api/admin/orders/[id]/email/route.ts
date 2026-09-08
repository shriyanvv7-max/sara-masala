import { NextResponse } from "next/server";
import { z } from "zod";
import { paymentAdmin, paymentError } from "../../../../../../lib/payment-security";
import { getOrderRecord, resendConfirmationEmail, sendFulfilmentEmail, sendRefundEmail } from "../../../../../../lib/order-notifications";
import { rateLimit } from "../../../../../../lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await paymentAdmin(); if (!admin) return paymentError(403, "Admin access required.");
  const limited = await rateLimit(request, { bucket: "admin-email", limit: 30, windowSeconds: 3600, identity: admin.id });
  if (limited) return limited;
  const id = z.string().uuid().safeParse((await params).id); if (!id.success) return paymentError(400, "Invalid order.");
  const input = z.object({ kind: z.enum(["confirmation", "status", "refund"]).default("confirmation") }).strict().safeParse(await request.json().catch(() => ({})));
  if (!input.success) return paymentError(400, "Invalid email request.");
  try {
    const order = await getOrderRecord(id.data);
    if (input.data.kind !== "refund" && order.payment_status !== "paid") return paymentError(409, "Only paid orders can receive this email.");
    if (input.data.kind !== "refund" && order.status === "payment_review") return paymentError(409, "Review-required payments cannot send normal customer updates.");
    let result;
    if (input.data.kind === "confirmation") result = await resendConfirmationEmail(id.data);
    else if (input.data.kind === "status") result = await sendFulfilmentEmail(id.data, order.status);
    else {
      if (order.refund_status !== "processed" || !order.razorpay_refund_id) return paymentError(409, "No processed refund email is available to retry.");
      result = await sendRefundEmail(id.data, order.razorpay_refund_id, Math.round(Number(order.total) * 100));
    }
    if (!result) return paymentError(409, "This order status does not have an email notification.");
    if ("duplicate" in result && result.duplicate) return NextResponse.json(result);
    if (!result.sent) return paymentError(502, "The email could not be sent. Please retry.");
    return NextResponse.json(result);
  } catch (error) { console.error("[email:admin-resend] failed", { orderId: id.data, error: error instanceof Error ? error.message : "Unknown error" }); return paymentError(502, "The email could not be sent. Please retry."); }
}
