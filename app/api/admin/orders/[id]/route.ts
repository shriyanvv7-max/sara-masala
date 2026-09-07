import { z } from "zod";
import { NextResponse } from "next/server";
import { paymentAdmin, paymentError } from "../../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await paymentAdmin()) return paymentError(403, "Admin access required.");
  const body = z.object({ status: z.enum(["confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"]) }).strict().safeParse(await request.json().catch(() => null));
  const id = z.string().uuid().safeParse((await params).id);
  if (!body.success || !id.success) return paymentError(400, "Invalid status.");
  const { data, error } = await supabaseAdmin().from("orders").update({ status: body.data.status, updated_at: new Date().toISOString() }).eq("id", id.data).eq("payment_status", "paid").neq("status", "refunded").select("id").maybeSingle();
  if (error || !data) return paymentError(409, "Only paid orders can be updated here.");
  return NextResponse.json({ ok: true });
}
