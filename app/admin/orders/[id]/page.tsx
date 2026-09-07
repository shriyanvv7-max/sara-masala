import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { OrderStatus } from "../../../../components/admin/order-status";
export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdmin();
  const { data: order } = await db.from("orders").select("*,order_items(product_name,weight,sku,quantity,unit_price,line_total)").eq("id", (await params).id).single();
  if (!order) notFound();
  const a = order.shipping_address;
  return <main className="admin"><Link href="/admin/orders">← Orders</Link><h1>{order.order_number || order.id}</h1><section><h2>Customer</h2><p>{order.customer_name} · {order.customer_email} · {order.customer_phone}</p>{a && <p>{a.line1} {a.line2}<br />{a.city}, {a.state} {a.postal_code}, {a.country}</p>}</section><section><h2>Items</h2>{order.order_items.map((i: any, index: number) => <p key={index}>{i.product_name} · {i.weight} × {i.quantity} · ₹{i.unit_price} each · ₹{i.line_total}</p>)}<p>Subtotal ₹{order.subtotal} · Shipping ₹{order.shipping} · Discount ₹{order.discount} · Total ₹{order.total}</p></section><section><h2>Payment</h2><p>{order.payment_status} · {order.status}</p><p>Razorpay order: {order.razorpay_order_id || "Pending"}</p><p>Razorpay payment: {order.razorpay_payment_id || "Pending"}</p><p>Paid at: {order.paid_at || "Not paid"}</p><p>Refund: {order.razorpay_refund_id || "None"} · {order.refund_status}</p></section><OrderStatus id={order.id} initial={order.status} paid={order.payment_status === "paid"} /></main>;
}
