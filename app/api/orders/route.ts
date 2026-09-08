import { NextResponse } from "next/server";

// Cash-on-delivery is not an active checkout method. Keeping this legacy endpoint
// write-free prevents clients from bypassing the verified Razorpay order workflow.
export async function POST() {
  return NextResponse.json({ error: "This order method is unavailable." }, { status: 405, headers: { "Cache-Control": "no-store" } });
}
