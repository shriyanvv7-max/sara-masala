"use client";
import Script from "next/script";
import { useRef, useState } from "react";
export type PaymentOrder = { internalOrderId: string; orderNumber: string; confirmationToken: string; razorpayOrderId: string; amount: number; currency: string; key: string; testMode: boolean; customer: { name: string; email: string; phone: string } };
type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay: new (options: Record<string, unknown>) => { on: (name: string, handler: () => void) => void; open: () => void } } }
export function RazorpayCheckout({ order, onSuccess, onFailure }: { order: PaymentOrder; onSuccess: (number: string, token: string) => void; onFailure: (message: string) => void }) {
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [response, setResponse] = useState<PaymentResponse | null>(null); const lock = useRef(false); const received = useRef(false);
  async function verify(value: PaymentResponse) {
    received.current = true; setResponse(value); setBusy(true); lock.current = true;
    try {
      const result = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internalOrderId: order.internalOrderId, ...value }) });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "Unable to verify payment. Retry verification; do not pay again.");
      if (!json.orderNumber || !json.confirmationToken) throw new Error("Confirmation unavailable. Retry verification.");
      onSuccess(json.orderNumber, json.confirmationToken);
    } catch (error) { onFailure(error instanceof Error ? error.message : "Unable to verify payment. Retry verification."); }
    finally { lock.current = false; setBusy(false); }
  }
  function open() {
    if (lock.current) return;
    if (response) { void verify(response); return; }
    if (!window.Razorpay) { onFailure("Secure payment could not load. Refresh this page and try again."); return; }
    lock.current = true; setBusy(true); onFailure("");
    try {
      const instance = new window.Razorpay({ key: order.key, amount: order.amount, currency: order.currency, order_id: order.razorpayOrderId, name: "Sara Masala", description: "Just Like Paati Made It", prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone }, theme: { color: "#294B35" }, handler: verify, modal: { ondismiss: () => { if (received.current) return; lock.current = false; setBusy(false); onFailure("Checkout closed. Your cart is saved. You can retry payment."); } } });
      instance.on("payment.failed", () => { lock.current = false; setBusy(false); onFailure("Payment was unsuccessful. Your cart is saved. Please retry."); });
      instance.open();
    } catch { lock.current = false; setBusy(false); onFailure("Unable to open payment. Please retry."); }
  }
  return <><Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => onFailure("Secure payment could not load. Please refresh and retry.")} />{order.testMode && <p role="status">Test Mode — no real money will be charged.</p>}<p>Order total: ₹{(order.amount / 100).toFixed(2)} (including shipping)</p><button type="button" className="add-cart" disabled={!ready || busy} onClick={open}>{busy ? "Processing payment…" : response ? "Retry payment verification" : ready ? "Pay securely with Razorpay" : "Loading secure payment…"}</button></>;
}
