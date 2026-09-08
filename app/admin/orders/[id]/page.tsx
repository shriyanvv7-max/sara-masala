import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { OrderStatus } from "../../../../components/admin/order-status";
import { OrderActions } from "../../../../components/admin/order-actions";
import { adminPaymentLabel, canFulfilOrder, isPendingOrderExpired } from "../../../../lib/order-lifecycle";
export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdmin();
  const { data: order } = await db.from("orders").select("*,order_items(product_name,weight,sku,quantity,unit_price,line_total)").eq("id", (await params).id).single();
  if (!order) notFound();
  const a = order.shipping_address;
  const address = a ? [a.line1, a.line2, `${a.city}, ${a.state} ${a.postal_code}`, a.country].filter(Boolean).join(", ") : "No address supplied";
  const expired = isPendingOrderExpired(order); const fulfilmentAllowed = canFulfilOrder(order); const paymentLabel = adminPaymentLabel(order);
  return <main className="admin"><Link href="/admin/orders">← Orders</Link><h1>{order.order_number || order.id}</h1>{expired && <p className="order-state-alert" role="status">Payment expired · Abandoned</p>}{order.status === "payment_review" && <p className="order-state-alert" role="alert">Late payment captured after expiry. Review the payment and refund or fulfil manually outside the normal workflow.</p>}<section><h2>Customer</h2><p>{order.customer_name} · {order.customer_email} · {order.customer_phone}</p>{a && <p>{a.line1} {a.line2}<br />{a.city}, {a.state} {a.postal_code}, {a.country}</p>}</section><section><h2>Items</h2>{order.order_items.map((i: any, index: number) => <p key={index}>{i.product_name} · {i.weight} × {i.quantity} · ₹{i.unit_price} each · ₹{i.line_total}</p>)}<p>Subtotal ₹{order.subtotal} · Shipping ₹{order.shipping} · Discount ₹{order.discount} · Total ₹{order.total}</p></section><section><h2>Payment</h2><p>{paymentLabel} · {order.status.replaceAll("_", " ")}</p><p>Expires at: {order.expires_at ? new Date(order.expires_at).toLocaleString("en-IN") : "Not set"}</p><p>Razorpay order: {order.razorpay_order_id || "Pending"}</p><p>Razorpay payment: {order.razorpay_payment_id || "Pending"}</p><p>Paid at: {order.paid_at || "Not paid"}</p><p>Refund: {order.razorpay_refund_id || "None"} · {order.refund_status || "Not requested"}</p>{order.payment_review_reason && <p>{order.payment_review_reason}</p>}</section><OrderStatus id={order.id} initial={order.status} paid={fulfilmentAllowed} /><OrderActions id={order.id} orderNumber={order.order_number} phone={order.customer_phone} address={address} paymentStatus={order.payment_status} status={order.status} refundStatus={order.refund_status} /></main>;
}
