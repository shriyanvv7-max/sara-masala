import "server-only";
import { randomUUID } from "crypto";
import { emailSubjects, type EmailName, sendEmail } from "./email";
import { supabaseAdmin } from "./supabase/admin";

export type OrderItemRecord = { product_name: string; weight: string; quantity: number; unit_price: number; line_total: number };
export type OrderRecord = {
  id: string; order_number: string; customer_id?: string | null; customer_name: string; customer_email: string; customer_phone: string;
  shipping_address: Record<string, string> | null; subtotal: number; shipping: number; discount: number; total: number; currency: string;
  payment_status: string; payment_method: string; status: string; created_at: string; paid_at?: string | null; confirmation_token: string;
  razorpay_payment_id?: string | null; razorpay_refund_id?: string | null; refund_status?: string | null; order_items: OrderItemRecord[];
};

const money = (value: number | string) => `₹${Number(value).toFixed(2)}`;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const trackingUrl = (order: OrderRecord) => `${siteUrl()}/order-confirmation/${encodeURIComponent(order.order_number)}?token=${encodeURIComponent(order.confirmation_token)}`;
const adminUrl = (order: OrderRecord) => `${siteUrl()}/admin/orders/${encodeURIComponent(order.id)}`;
const addressHtml = (address: Record<string, string> | null) => address ? [address.line1, address.line2, `${address.city}, ${address.state} ${address.postal_code}`, address.country].filter(Boolean).map(escapeHtml).join("<br>") : "Not supplied";
const itemsHtml = (order: OrderRecord) => `<table role="presentation" style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Product</th><th align="left">Weight</th><th align="right">Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead><tbody>${order.order_items.map(item => `<tr><td style="padding:8px 0;border-top:1px solid #e5ddcf">${escapeHtml(item.product_name)}</td><td style="border-top:1px solid #e5ddcf">${escapeHtml(item.weight)}</td><td align="right" style="border-top:1px solid #e5ddcf">${item.quantity}</td><td align="right" style="border-top:1px solid #e5ddcf">${money(item.unit_price)}</td><td align="right" style="border-top:1px solid #e5ddcf">${money(item.line_total)}</td></tr>`).join("")}</tbody></table>`;
const totalsHtml = (order: OrderRecord) => `<p>Subtotal: <strong>${money(order.subtotal)}</strong><br>Shipping: <strong>${money(order.shipping)}</strong><br>Discount: <strong>${money(order.discount)}</strong><br>Total: <strong>${money(order.total)}</strong></p>`;
const frame = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#f7f1e5;color:#2a2a2a;font-family:Arial,sans-serif"><div style="max-width:660px;margin:auto;background:#fcfaf7;padding:32px"><div style="color:#294b35;font-size:30px;font-weight:700">SARA <span style="color:#e8a317">MASALA</span></div><p style="color:#8b5e3c">Just Like Paati Made It</p><h1 style="color:#294b35">${escapeHtml(title)}</h1>${body}<p style="margin-top:32px;color:#777;font-size:12px">Sara Masala, Mysuru</p></div></body></html>`;

export async function getOrderRecord(orderId: string) {
  const { data, error } = await supabaseAdmin().from("orders").select("*,order_items(product_name,weight,quantity,unit_price,line_total)").eq("id", orderId).single();
  if (error || !data) throw new Error("Order could not be loaded for notification");
  return data as OrderRecord;
}

async function claimDelivery(orderId: string, eventKey: string, recipient: string, emailType: EmailName) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("order_email_events").insert({ order_id: orderId, event_key: eventKey, recipient, email_type: emailType, status: "sending", attempt_count: 1 }).select("id").single();
  if (!error && data) return data.id as string;
  if (error?.code !== "23505") throw error || new Error("Unable to record email delivery");
  const { data: retry } = await db.from("order_email_events").update({ status: "sending", last_error: null, updated_at: new Date().toISOString() }).eq("order_id", orderId).eq("event_key", eventKey).eq("recipient", recipient).eq("status", "failed").select("id,attempt_count").maybeSingle();
  if (retry) await db.from("order_email_events").update({ attempt_count: Number(retry.attempt_count || 1) + 1 }).eq("id", retry.id);
  return retry?.id as string | undefined;
}

async function deliver(order: OrderRecord, eventKey: string, recipient: string, name: EmailName, html: string, subject?: string) {
  let deliveryId: string | undefined;
  try {
    deliveryId = await claimDelivery(order.id, eventKey, recipient, name);
    if (!deliveryId) return { sent: false, duplicate: true };
    const result = await sendEmail({ name, to: recipient, html, subject });
    await supabaseAdmin().from("order_email_events").update({ status: "sent", provider_id: result.providerId, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", deliveryId);
    return result;
  } catch (error) {
    console.error(`[email:${name}] delivery failed`, { orderId: order.id, error: error instanceof Error ? error.message : "Unknown email error" });
    if (deliveryId) await supabaseAdmin().from("order_email_events").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown email error", updated_at: new Date().toISOString() }).eq("id", deliveryId);
    return { sent: false, error: true };
  }
}

export async function sendPaidOrderEmails(orderId: string) {
  try {
    const order = await getOrderRecord(orderId);
    if (order.payment_status !== "paid" || order.status === "payment_review") return;
    const customerBody = `<p>Hello ${escapeHtml(order.customer_name)},</p><p>Thank you. Your payment has been verified and order <strong>${escapeHtml(order.order_number)}</strong> is confirmed.</p>${itemsHtml(order)}${totalsHtml(order)}<h2>Delivery address</h2><p>${addressHtml(order.shipping_address)}</p><p>Payment status: <strong>Paid</strong></p><p>${escapeHtml(process.env.EXPECTED_DELIVERY_MESSAGE || "Expected delivery in 3-7 business days after dispatch.")}</p><p><a href="${trackingUrl(order)}" style="color:#294b35;font-weight:700">View order and download invoice</a></p>`;
    const adminEmail = process.env.ADMIN_ORDER_EMAIL?.trim();
    const jobs: Promise<unknown>[] = [deliver(order, "paid:customer", order.customer_email, "order-confirmation", frame("Order confirmed", customerBody))];
    if (adminEmail) jobs.push(deliver(order, "paid:admin", adminEmail, "admin-new-order", frame("New paid order", `<p><strong>${escapeHtml(order.order_number)}</strong></p><p>${escapeHtml(order.customer_name)}<br>${escapeHtml(order.customer_email)}<br>${escapeHtml(order.customer_phone)}</p>${itemsHtml(order)}${totalsHtml(order)}<h2>Delivery address</h2><p>${addressHtml(order.shipping_address)}</p><p><a href="${adminUrl(order)}">Open order in admin</a></p>`)));
    await Promise.allSettled(jobs);
  } catch (error) { console.error("[email:paid-order] notification preparation failed", { orderId, error: error instanceof Error ? error.message : "Unknown error" }); }
}

const fulfilmentCopy: Partial<Record<string, { name: EmailName; title: string; message: string }>> = {
  packed: { name: "order-packed", title: "Your order is packed", message: "Your Sara Masala order has been carefully packed and will be handed to the courier soon." },
  shipped: { name: "order-shipped", title: "Your order has shipped", message: "Your Sara Masala order is on its way." },
  out_for_delivery: { name: "order-out-for-delivery", title: "Out for delivery", message: "Your Sara Masala order is out for delivery today." },
  delivered: { name: "order-delivered", title: "Order delivered", message: "Your Sara Masala order has been marked as delivered. We hope it brings warmth to your kitchen." },
  cancelled: { name: "order-cancelled", title: "Order cancelled", message: "Your Sara Masala order has been cancelled. Please contact support if you need help." },
};

export async function sendFulfilmentEmail(orderId: string, status: string) {
  const copy = fulfilmentCopy[status]; if (!copy) return;
  try { const order = await getOrderRecord(orderId); return await deliver(order, `fulfilment:${status}`, order.customer_email, copy.name, frame(copy.title, `<p>Hello ${escapeHtml(order.customer_name)},</p><p>${copy.message}</p><p>Order: <strong>${escapeHtml(order.order_number)}</strong></p><p><a href="${trackingUrl(order)}">Track your order</a></p>`)); }
  catch (error) { console.error(`[email:fulfilment:${status}] preparation failed`, { orderId, error: error instanceof Error ? error.message : "Unknown error" }); return { sent: false, error: true }; }
}

export async function sendRefundEmail(orderId: string, refundId: string, amountPaise: number) {
  try { const order = await getOrderRecord(orderId); return await deliver(order, `refund:${refundId}`, order.customer_email, "refund-processed", frame("Refund processed", `<p>Hello ${escapeHtml(order.customer_name)},</p><p>Your refund for order <strong>${escapeHtml(order.order_number)}</strong> has been processed.</p><p>Refund amount: <strong>${money(amountPaise / 100)}</strong><br>Refund ID: <strong>${escapeHtml(refundId)}</strong></p><p>Banks and payment providers typically take 5-7 business days to reflect the refund. Timings may vary by bank.</p>`)); }
  catch (error) { console.error("[email:refund] preparation failed", { orderId, error: error instanceof Error ? error.message : "Unknown error" }); return { sent: false, error: true }; }
}

export async function resendConfirmationEmail(orderId: string) {
  const order = await getOrderRecord(orderId);
  const body = `<p>Hello ${escapeHtml(order.customer_name)},</p><p>Your paid order <strong>${escapeHtml(order.order_number)}</strong> is confirmed.</p>${itemsHtml(order)}${totalsHtml(order)}<h2>Delivery address</h2><p>${addressHtml(order.shipping_address)}</p><p><a href="${trackingUrl(order)}">View order and download invoice</a></p>`;
  return deliver(order, `paid:customer:manual:${randomUUID()}`, order.customer_email, "order-confirmation", frame("Order confirmed", body), emailSubjects["order-confirmation"]);
}
