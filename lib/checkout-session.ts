export const CHECKOUT_DETAILS_STORAGE_KEY = "sara-checkout-details";
export const CHECKOUT_REQUEST_STORAGE_KEY = "sara-checkout-request";

export type CheckoutDetails = {
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: "India" };
  coupon_code?: string;
};

export type StoredCheckoutRequest = {
  id: string;
  fingerprint: string;
  cartFingerprint: string;
  internalOrderId?: string;
  razorpayOrderId?: string;
  expiresAt?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type CartIdentityItem = { variant_id?: string | null; quantity: number };

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function createCartFingerprint(items: CartIdentityItem[]) {
  return JSON.stringify(items
    .filter((item): item is { variant_id: string; quantity: number } => typeof item.variant_id === "string")
    .map(item => ({ variant_id: item.variant_id, quantity: item.quantity }))
    .sort((a, b) => a.variant_id.localeCompare(b.variant_id)));
}

export function readCheckoutDetails(storage: StorageLike): CheckoutDetails | null {
  try {
    const value = JSON.parse(storage.getItem(CHECKOUT_DETAILS_STORAGE_KEY) || "null");
    if (!value || typeof value !== "object") return null;
    return {
      customer: {
        name: stringValue(value.customer?.name),
        email: stringValue(value.customer?.email),
        phone: stringValue(value.customer?.phone),
      },
      address: {
        line1: stringValue(value.address?.line1),
        line2: stringValue(value.address?.line2),
        city: stringValue(value.address?.city),
        state: stringValue(value.address?.state),
        postal_code: stringValue(value.address?.postal_code),
        country: "India",
      },
      coupon_code: stringValue(value.coupon_code),
    };
  } catch {
    storage.removeItem(CHECKOUT_DETAILS_STORAGE_KEY);
    return null;
  }
}

export function writeCheckoutDetails(storage: StorageLike, details: CheckoutDetails) {
  storage.setItem(CHECKOUT_DETAILS_STORAGE_KEY, JSON.stringify(details));
}

export function readCheckoutRequest(storage: StorageLike): StoredCheckoutRequest | null {
  try {
    const value = JSON.parse(storage.getItem(CHECKOUT_REQUEST_STORAGE_KEY) || "null");
    if (!value || typeof value.id !== "string" || typeof value.fingerprint !== "string" || typeof value.cartFingerprint !== "string") return null;
    return value;
  } catch {
    storage.removeItem(CHECKOUT_REQUEST_STORAGE_KEY);
    return null;
  }
}

export function writeCheckoutRequest(storage: StorageLike, request: StoredCheckoutRequest) {
  storage.setItem(CHECKOUT_REQUEST_STORAGE_KEY, JSON.stringify(request));
}

export function clearCheckoutRequest(storage: StorageLike) {
  storage.removeItem(CHECKOUT_REQUEST_STORAGE_KEY);
}

export function clearCheckoutPaymentState(storage: StorageLike) {
  storage.removeItem(CHECKOUT_DETAILS_STORAGE_KEY);
  storage.removeItem(CHECKOUT_REQUEST_STORAGE_KEY);
}

export function canResumeBuyNowCheckout(stored: StoredCheckoutRequest | null, items: CartIdentityItem[], variantId: string) {
  return Boolean(
    stored?.internalOrderId &&
    stored.razorpayOrderId &&
    stored.cartFingerprint === createCartFingerprint(items) &&
    items.some(item => item.variant_id === variantId && item.quantity > 0),
  );
}
