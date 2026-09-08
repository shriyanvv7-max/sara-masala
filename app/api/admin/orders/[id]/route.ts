import { z } from "zod";
import { NextResponse } from "next/server";
import { paymentAdmin, paymentError } from "../../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { sendFulfilmentEmail } from "../../../../../lib/order-notifications";
import { canFulfilOrder } from "../../../../../lib/order-lifecycle";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await paymentAdmin()) return paymentError(403, "Admin access required.");
  const body = z.object({ status: z.enum(["confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"]) }).strict().safeParse(await request.json().catch(() => null));
  const id = z.string().uuid().safeParse((await params).id);
  if (!body.success || !id.success) return paymentError(400, "Invalid status.");
  const db = supabaseAdmin();
  const { data: current, error: lookupError } = await db.from("orders").select("status,payment_status,expires_at").eq("id", id.data).single();
  if (lookupError || !current || !canFulfilOrder(current)) return paymentError(409, "Expired, unpaid, cancelled, refunded, or review-required orders cannot be fulfilled.");
  if (current.status === body.data.status) return NextResponse.json({ ok: true, unchanged: true });
  const { data, error } = await db.from("orders").update({ status: body.data.status, updated_at: new Date().toISOString() }).eq("id", id.data).eq("status", current.status).select("id").maybeSingle();
  if (error || !data) return paymentError(409, "Only paid orders can be updated here.");
  await sendFulfilmentEmail(id.data, body.data.status);
  return NextResponse.json({ ok: true });
}
