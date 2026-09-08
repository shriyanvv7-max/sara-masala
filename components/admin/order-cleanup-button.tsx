"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderCleanupButton() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function cleanup() { setBusy(true); setMessage(""); try { const response = await fetch("/api/admin/orders/cleanup", { method: "POST" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(`${result.expired} pending order${result.expired === 1 ? "" : "s"} marked abandoned.`); router.refresh(); } catch { setMessage("Unable to refresh pending orders."); } finally { setBusy(false); } }
  return <div className="order-cleanup"><button type="button" onClick={cleanup} disabled={busy}>{busy ? "Refreshing…" : "Refresh expired orders"}</button>{message && <span role="status">{message}</span>}</div>;
}
