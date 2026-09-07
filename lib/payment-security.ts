import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
export function validSignature(body: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature, "hex"));
}
export function paymentError(status = 503, message = "Payments are temporarily unavailable. Please try again later.") {
  return NextResponse.json({ error: message }, { status });
}
export async function paymentAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return user?.app_metadata?.role === "admin" ? user : null;
}
