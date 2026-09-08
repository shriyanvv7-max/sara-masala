export const PENDING_ORDER_TTL_MS = 30 * 60 * 1000;

export type PendingOrderState = { status: string; payment_status: string; expires_at?: string | null; checkout_fingerprint?: string | null };

export function isPendingOrderExpired(order: PendingOrderState, now = new Date()) {
  if (order.status === "abandoned" || order.payment_status === "expired") return true;
  return order.payment_status === "pending" && Boolean(order.expires_at) && new Date(order.expires_at!).getTime() <= now.getTime();
}

export function canReusePendingOrder(order: PendingOrderState, fingerprint: string, now = new Date()) {
  return order.status === "pending" && order.payment_status === "pending" && order.checkout_fingerprint === fingerprint && !isPendingOrderExpired(order, now);
}

export function canFulfilOrder(order: PendingOrderState, now = new Date()) {
  return order.payment_status === "paid" && ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"].includes(order.status) && !isPendingOrderExpired(order, now);
}

export function adminPaymentLabel(order: PendingOrderState, now = new Date()) {
  if (order.status === "payment_review") return "Payment review";
  if (isPendingOrderExpired(order, now)) return "Abandoned";
  if (order.payment_status === "partially_refunded") return "Partially refunded";
  return order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1);
}
