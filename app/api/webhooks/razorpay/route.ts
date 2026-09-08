import { NextResponse } from "next/server";
import { z } from "zod";
import { validSignature, paymentError } from "../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { getRazorpay } from "../../../../lib/razorpay";
import { sendPaidOrderEmails, sendRefundEmail } from "../../../../lib/order-notifications";
export const runtime = "nodejs";
const envelope = z.object({ event: z.string(), payload: z.record(z.any()) });
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return paymentError();
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-razorpay-signature") || "", secret)) return paymentError(400, "Invalid signature.");
  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId || eventId.length > 200) return paymentError(400, "Invalid event ID.");
  let input; try { input = envelope.parse(JSON.parse(raw)); } catch { return paymentError(400, "Invalid event."); }
  const supported = ["payment.captured", "order.paid", "payment.failed", "refund.processed"];
  if (!supported.includes(input.event)) return NextResponse.json({ ok: true, ignored: true });
  try {
    const db = supabaseAdmin();
    const { data: old, error: lookup } = await db.from("payment_events").select("processed_at").eq("provider_event_id", eventId).maybeSingle();
    if (lookup) throw lookup;
    if (old?.processed_at) return NextResponse.json({ ok: true, duplicate: true });
    const { error: recordError } = await db.from("payment_events").insert({ provider: "razorpay", provider_event_id: eventId, event_type: input.event, payload: input });
    if (recordError && recordError.code !== "23505") throw recordError;
    const refund = input.payload.refund?.entity;
    const paymentId = input.event === "refund.processed" ? refund?.payment_id : input.payload.payment?.entity?.id;
    if (typeof paymentId !== "string") throw new Error("Missing payment");
    const payment = await getRazorpay().payments.fetch(paymentId);
    const { data: order, error } = await db.from("orders").select("id,total").eq("razorpay_order_id", payment.order_id).single();
    if (error || !order || payment.currency !== "INR") throw new Error("Order mismatch");
    if (["order.paid", "payment.captured"].includes(input.event) && payment.status !== "captured") throw new Error("Not captured");
    let amount = Number(payment.amount); let refundId: string | null = null; let refundEmailAmount = 0;
    if (input.event === "refund.processed") {
      const verifiedRefund = await getRazorpay().refunds.fetch(refund?.id);
      if (verifiedRefund.payment_id !== paymentId || verifiedRefund.status !== "processed") throw new Error("Refund mismatch");
      amount = Number(payment.amount_refunded); refundEmailAmount = Number(verifiedRefund.amount); refundId = verifiedRefund.id;
    }
    const { error: processed } = await db.rpc("process_razorpay_event", { p_event_id: eventId, p_type: input.event, p_payload: input, p_order_id: order.id, p_payment_id: paymentId, p_amount: amount, p_refund_id: refundId });
    if (processed) throw processed;
    if (["order.paid", "payment.captured"].includes(input.event)) await sendPaidOrderEmails(order.id);
    if (input.event === "refund.processed" && refundId) await sendRefundEmail(order.id, refundId, refundEmailAmount);
    return NextResponse.json({ ok: true });
  } catch { console.error("[payment:webhook] Processing failed; event remains retryable", eventId); return paymentError(500, "Webhook processing failed."); }
}
