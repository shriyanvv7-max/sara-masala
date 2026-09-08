"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; orderNumber: string; phone: string; address: string; paymentStatus: string; status: string; refundStatus?: string | null };

export function OrderActions({ id, orderNumber, phone, address, paymentStatus, status, refundStatus }: Props) {
  const router = useRouter(); const [busy, setBusy] = useState(""); const [message, setMessage] = useState(""); const [reason, setReason] = useState("");
  const invoiceUrl = `/api/orders/${encodeURIComponent(orderNumber)}/invoice`;
  async function resend(kind: "confirmation" | "status" | "refund") { setBusy(kind); setMessage(""); try { const response = await fetch(`/api/admin/orders/${id}/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(result.duplicate ? "That email was already sent; no duplicate was created." : "Email sent."); } catch { setMessage("The email could not be sent. Please retry."); } finally { setBusy(""); } }
  async function copy(value: string, label: string) { try { await navigator.clipboard.writeText(value); setMessage(`${label} copied.`); } catch { setMessage(`Unable to copy ${label.toLowerCase()}.`); } }
  async function refund() {
    if (reason.trim().length < 5) { setMessage("Enter a refund reason of at least 5 characters."); return; }
    if (!window.confirm(`Process a full refund for ${orderNumber}? This action cannot be undone.`)) return;
    setBusy("refund"); setMessage("");
    try { const response = await fetch(`/api/admin/orders/${id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, confirmFullRefund: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(`Refund submitted. Razorpay refund ID: ${result.refundId}`); router.refresh(); }
    catch { setMessage("Refund could not be completed. Check Razorpay before retrying."); } finally { setBusy(""); }
  }
  const canRefund = paymentStatus === "paid" && !refundStatus;
  const hasStatusEmail = ["packed", "shipped", "out_for_delivery", "delivered", "cancelled"].includes(status);
  const canSendConfirmation = paymentStatus === "paid" && status !== "payment_review";
  return <section className="admin-order-actions"><h2>Order actions</h2><div><button type="button" onClick={() => resend("confirmation")} disabled={Boolean(busy) || !canSendConfirmation}>{busy === "confirmation" ? "Sending…" : "Send/re-send confirmation"}</button>{hasStatusEmail && <button type="button" onClick={() => resend("status")} disabled={Boolean(busy)}>{busy === "status" ? "Sending…" : "Retry current status email"}</button>}{refundStatus === "processed" && <button type="button" onClick={() => resend("refund")} disabled={Boolean(busy)}>{busy === "refund" ? "Sending…" : "Retry refund email"}</button>}<a href={invoiceUrl}>Download invoice</a><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">Print invoice</a><button type="button" onClick={() => copy(phone, "Phone")}>Copy phone</button><button type="button" onClick={() => copy(address, "Address")}>Copy address</button></div><label>Refund reason<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Reason for full refund" disabled={!canRefund || busy === "refund"} /></label><button type="button" className="admin-refund" onClick={refund} disabled={!canRefund || busy === "refund"}>{busy === "refund" ? "Processing refund…" : refundStatus ? `Refund ${refundStatus}` : "Process full refund"}</button>{message && <p role="status">{message}</p>}</section>;
}
