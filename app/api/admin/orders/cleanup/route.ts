import { NextResponse } from "next/server";
import { paymentAdmin, paymentError } from "../../../../../lib/payment-security";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { rateLimit } from "../../../../../lib/rate-limit";

export async function POST(request: Request) {
  const admin = await paymentAdmin();
  if (!admin) return paymentError(403, "Admin access required.");
  const limited = await rateLimit(request, { bucket: "admin-order-cleanup", limit: 30, windowSeconds: 3600, identity: admin.id });
  if (limited) return limited;
  const { data, error } = await supabaseAdmin().rpc("expire_pending_razorpay_orders");
  if (error) { console.error("[orders:cleanup] Expiry cleanup failed", { code: error.code }); return paymentError(500, "Pending orders could not be refreshed."); }
  return NextResponse.json({ expired: Number(data || 0) });
}
