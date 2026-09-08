"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { checkoutSchema } from "../../lib/validations";
import { useCart } from "../cart-provider";
import { PaymentOrder, RazorpayCheckout } from "./razorpay-checkout";
import { z } from "zod";
import {
  clearCheckoutPaymentState,
  clearCheckoutRequest,
  createCartFingerprint,
  readCheckoutDetails,
  readCheckoutRequest,
  writeCheckoutDetails,
  writeCheckoutRequest,
  type StoredCheckoutRequest,
} from "../../lib/checkout-session";
const detailsSchema = checkoutSchema.omit({ items: true });
const variantIdSchema = z.string().uuid();
const unavailableCartMessage = "One or more items in your cart are no longer available. Please return to the cart and reselect the product.";
type Values = z.infer<typeof detailsSchema>;
export function CheckoutForm() {
  const { items, clear } = useCart(); const router = useRouter();
  const [payment, setPayment] = useState<PaymentOrder | null>(null); const [message, setMessage] = useState("");
  const [hasPendingRetry, setHasPendingRetry] = useState(false);
  const request = useRef<StoredCheckoutRequest | null>(null); const lock = useRef(false);
  const form = useForm<Values>({ resolver: zodResolver(detailsSchema), defaultValues: { customer: { name: "", email: "", phone: "" }, address: { line1: "", line2: "", city: "", state: "", postal_code: "", country: "India" }, coupon_code: "" } });

  useEffect(() => {
    const saved = readCheckoutDetails(localStorage);
    if (saved) form.reset(saved);
    const subscription = form.watch(value => writeCheckoutDetails(localStorage, value as Values));
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const stored = readCheckoutRequest(localStorage);
    const sameCart = stored?.cartFingerprint === createCartFingerprint(items);
    if (stored && sameCart) request.current = stored;
    setHasPendingRetry(Boolean(stored?.internalOrderId && stored.razorpayOrderId && sameCart));
  }, [items]);

  async function getCheckoutRequest(fingerprint: string, cartFingerprint: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
    const fingerprintHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (request.current?.fingerprint === fingerprintHash && request.current.cartFingerprint === cartFingerprint) return request.current;
    const stored = readCheckoutRequest(localStorage);
    if (stored?.fingerprint === fingerprintHash && stored.cartFingerprint === cartFingerprint && variantIdSchema.safeParse(stored.id).success) return request.current = stored;
    request.current = { fingerprint: fingerprintHash, cartFingerprint, id: crypto.randomUUID() };
    writeCheckoutRequest(localStorage, request.current);
    setHasPendingRetry(false);
    return request.current;
  }
  function resetCheckoutRequest() { request.current = null; clearCheckoutRequest(localStorage); setHasPendingRetry(false); setPayment(null); }
  async function prepare(values: Values) {
    if (lock.current) return; lock.current = true; setMessage("");
    try {
      if (items.some(item => !item.variant_id || !variantIdSchema.safeParse(item.variant_id).success)) {
        setMessage(unavailableCartMessage);
        return;
      }
      const lineItems = items.map(item => ({ variant_id: item.variant_id!, quantity: item.quantity }));
      const data = checkoutSchema.safeParse({ ...values, items: lineItems });
      if (!data.success) throw new Error("Please review your cart and checkout details.");
      const fingerprint = JSON.stringify(data.data);
      const cartFingerprint = createCartFingerprint(lineItems);
      for (let attempt = 0; attempt < 2; attempt++) {
        const checkoutRequest = await getCheckoutRequest(fingerprint, cartFingerprint);
        const result = await fetch("/api/payments/razorpay/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data.data, requestId: checkoutRequest.id }) });
        const json = await result.json();
        if (!result.ok && (json.code === "ORDER_EXPIRED" || json.code === "CHECKOUT_CHANGED") && attempt === 0) { resetCheckoutRequest(); continue; }
        if (!result.ok) throw new Error(json.error || "Unable to prepare payment.");
        request.current = { ...checkoutRequest, internalOrderId: json.internalOrderId, razorpayOrderId: json.razorpayOrderId, expiresAt: json.expiresAt };
        writeCheckoutRequest(localStorage, request.current);
        setHasPendingRetry(true);
        setPayment(json); break;
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to connect. Please retry."); }
    finally { lock.current = false; }
  }
  function handleInvalid(errors: FieldErrors<Values>) {
    setMessage("Please review the highlighted checkout fields and try again.");
    if (process.env.NODE_ENV === "development") console.warn("Checkout validation failed", errors);
  }
  const fields = [ ["customer.name", "Full name"], ["customer.email", "Email address"], ["customer.phone", "10-digit mobile number"], ["address.line1", "Address line 1"], ["address.line2", "Address line 2 (optional)"], ["address.city", "City"], ["address.state", "State"], ["address.postal_code", "6-digit PIN code"] ] as const;
  return <form noValidate onSubmit={form.handleSubmit(prepare, handleInvalid)}>{!payment && <><section><h2>Customer and delivery details</h2>{fields.map(([name, label]) => { const error = form.getFieldState(name, form.formState).error; return <label key={name}>{label}<input type={name === "customer.email" ? "email" : "text"} aria-invalid={!!error} {...form.register(name)} />{error && <span role="alert">{error.message}</span>}</label>; })}<input aria-label="Country" readOnly {...form.register("address.country")} /></section><button type="submit" className="add-cart" disabled={!items.length || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Preparing payment…" : hasPendingRetry ? "Retry payment" : "Continue to payment"}</button></>}{payment && <RazorpayCheckout order={payment} onExpired={() => { resetCheckoutRequest(); setMessage("Payment session expired. Your details are saved. Continue to create a new secure payment session."); }} onSuccess={(number, token) => { clearCheckoutPaymentState(localStorage); request.current = null; clear(); router.replace(`/order-confirmation/${encodeURIComponent(number)}?token=${encodeURIComponent(token)}`); router.refresh(); }} onFailure={setMessage} />}{message && <p role="alert">{message}</p>}</form>;
}
