import { NextResponse } from "next/server";
import { paymentAdmin, paymentError } from "../../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";

export async function POST() {
  if (!await paymentAdmin()) return paymentError(403, "Admin access required.");
  const { data, error } = await supabaseAdmin().rpc("expire_pending_razorpay_orders");
  if (error) { console.error("[orders:cleanup] Expiry cleanup failed", { code: error.code, message: error.message }); return paymentError(500, "Pending orders could not be refreshed."); }
  return NextResponse.json({ expired: Number(data || 0) });
}
