import { NextResponse } from "next/server";
import { z } from "zod";
import { generateInvoicePdf } from "../../../../../lib/invoice";
import type { OrderRecord } from "../../../../../lib/order-notifications";
import { createClient } from "../../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { canAccessInvoice } from "../../../../../lib/invoice-access";
import { rateLimit } from "../../../../../lib/rate-limit";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const limited = await rateLimit(request, { bucket: "invoice-download", limit: 60, windowSeconds: 600 });
  if (limited) return limited;
  const orderNumber = z.string().regex(/^SM-[A-Z0-9-]{4,80}$/i).safeParse((await params).orderNumber);
  if (!orderNumber.success) return new NextResponse("Not found", { status: 404 });
  const { data } = await supabaseAdmin().from("orders").select("*,order_items(product_name,weight,quantity,unit_price,line_total)").eq("order_number", orderNumber.data).single();
  if (!data) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url); const token = url.searchParams.get("token");
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  const validToken = token && z.string().uuid().safeParse(token).success ? token : null;
  if (!canAccessInvoice({ userId: user?.id, isAdmin: user?.app_metadata?.role === "admin", customerId: data.customer_id, token: validToken, confirmationToken: data.confirmation_token })) return new NextResponse("Not found", { status: 404 });
  if (data.payment_status !== "paid" && data.payment_status !== "refunded" && data.payment_status !== "partially_refunded") return new NextResponse("Invoice unavailable", { status: 409 });

  const pdf = await generateInvoicePdf(data as OrderRecord);
  const disposition = url.searchParams.get("view") === "1" ? "inline" : "attachment";
  return new Response(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="invoice-${orderNumber.data}.pdf"`, "Cache-Control": "private, no-store" } });
}
