import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "../../../lib/rate-limit";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.literal("").optional(),
}).strict();
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export async function POST(request: Request) {
  const limited = await rateLimit(request, { bucket: "contact", limit: 5, windowSeconds: 3600 });
  if (limited) return limited;
  const input = contactSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Please check your contact details and message." }, { status: 400 });
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = process.env.CONTACT_EMAIL?.trim() || process.env.ADMIN_ORDER_EMAIL?.trim();
  if (!apiKey || !from || !to) return NextResponse.json({ error: "Contact messages are temporarily unavailable. Please email us directly." }, { status: 503 });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: input.data.email, subject: "Sara Masala website enquiry", html: `<h1>Website enquiry</h1><p><strong>From:</strong> ${escapeHtml(input.data.name)}</p><p>${escapeHtml(input.data.message).replace(/\n/g, "<br>")}</p>` }),
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    console.info("[contact] Message accepted by email provider");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] Delivery failed", { reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "We could not send your message. Please try again later." }, { status: 502 });
  }
}
