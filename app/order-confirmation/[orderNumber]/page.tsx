import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase/admin";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Confirmation({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderNumber } = await params; const { token } = await searchParams;
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) notFound();
  const { data: order } = await supabaseAdmin().from("orders").select("order_number,customer_name,shipping_address,status,payment_status,subtotal,shipping,discount,total,order_items(product_name,weight,quantity,unit_price,line_total)").eq("order_number", orderNumber).eq("confirmation_token", token).single();
  if (!order) notFound(); const a = order.shipping_address;
  return <main className="content-page confirmation"><p className="eyebrow">{order.payment_status === "paid" ? "ORDER CONFIRMED" : "ORDER STATUS"}</p><h1>Thank you,<br /><em>{order.customer_name}.</em></h1><p>Order {order.order_number}</p><p>Payment: {order.payment_status} · Order: {order.status}</p><section><h2>Order details</h2>{order.order_items.map((i: any, n: number) => <p key={n}>{i.product_name} · {i.weight} × {i.quantity} · ₹{i.unit_price} each <b>₹{i.line_total}</b></p>)}<p>Subtotal ₹{order.subtotal}</p><p>Shipping ₹{order.shipping}</p><p>Discount ₹{order.discount}</p><p>Total ₹{order.total}</p></section>{a && <section><h2>Delivering to</h2><p>{a.line1}<br />{a.line2}<br />{a.city}, {a.state} - {a.postal_code}<br />{a.country}</p></section>}<Link className="add-cart" href="/shop">Continue shopping</Link></main>;
}
