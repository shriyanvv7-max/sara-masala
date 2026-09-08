"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function OrderStatus({ id, initial, paid }: { id: string; initial: string; paid: boolean }) {
  const router = useRouter(); const [status, setStatus] = useState(initial); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function save() { setBusy(true); try { const result = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const json = await result.json(); if (!result.ok) throw new Error(json.error); setMessage("Order status saved."); router.refresh(); } catch { setMessage("Unable to update this order."); } finally { setBusy(false); } }
  return <section><h2>Fulfilment</h2><select aria-label="Order status" value={status} onChange={e => setStatus(e.target.value)} disabled={!paid || busy}>{["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded", "abandoned", "payment_review"].map(s => <option key={s} value={s} disabled={["pending", "refunded", "abandoned", "payment_review"].includes(s)}>{s.replaceAll("_", " ")}</option>)}</select><button type="button" className="add-cart" disabled={!paid || busy} onClick={save}>{busy ? "Saving…" : "Save fulfilment status"}</button>{!paid && <p>This order is not eligible for fulfilment updates.</p>}<p role="status">{message}</p></section>;
}
