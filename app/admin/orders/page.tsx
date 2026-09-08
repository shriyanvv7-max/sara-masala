import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { adminPaymentLabel, isPendingOrderExpired } from "../../../lib/order-lifecycle";
import { OrderCleanupButton } from "../../../components/admin/order-cleanup-button";

const filters = [["All", "all"], ["Paid", "paid"], ["Pending", "pending"], ["Failed", "failed"], ["Abandoned", "abandoned"], ["Refunded", "refunded"]] as const;

export default async function Orders({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { db } = await requireAdmin(); const requested = (await searchParams).filter || "all";
  const filter = filters.some(([, value]) => value === requested) ? requested : "all"; const now = new Date();
  let query = db.from("orders").select("id,order_number,status,total,payment_status,payment_method,created_at,expires_at,customer_name,customer_email,order_items(quantity)");
  if (filter === "paid") query = query.eq("payment_status", "paid");
  if (filter === "pending") query = query.eq("payment_status", "pending").eq("status", "pending").gt("expires_at", now.toISOString());
  if (filter === "failed") query = query.eq("payment_status", "failed");
  if (filter === "refunded") query = query.in("payment_status", ["refunded", "partially_refunded"]);
  const { data: rows } = await query.order("created_at", { ascending: false });
  const data = filter === "abandoned" ? rows?.filter(order => isPendingOrderExpired(order, now)) : rows;
  return <main className="admin"><p className="eyebrow">FULFILMENT</p><h1>Orders</h1><div className="order-admin-tools"><nav aria-label="Order filters">{filters.map(([label, value]) => <Link className={filter === value ? "active" : ""} href={value === "all" ? "/admin/orders" : `/admin/orders?filter=${value}`} key={value}>{label}</Link>)}</nav><OrderCleanupButton /></div><div className="admin-table">{data?.length ? data.map((order: any) => { const abandoned = isPendingOrderExpired(order, now); const label = adminPaymentLabel(order, now); const state = order.status === "payment_review" ? "Payment review · refund/review required" : abandoned ? "Abandoned · payment expired" : `${label} · ${order.status}`; return <article className={abandoned ? "order-abandoned" : ""} key={order.id}><div><Link href={`/admin/orders/${order.id}`}><b>{order.order_number || `#${order.id.slice(0, 8)}`}</b></Link><small>{order.customer_name || order.customer_email || "Guest"} · {order.order_items?.length || 0} items</small></div><span className={abandoned || order.status === "payment_review" ? "low-stock" : ""}>{state}</span><b>₹{order.total}</b></article>; }) : <p>No orders in this filter.</p>}</div></main>;
}
