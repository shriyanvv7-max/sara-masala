import "server-only";
import Razorpay from "razorpay";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  if (!keyId || !keySecret || publicKey !== keyId || !/^rzp_(test|live)_/.test(keyId)) throw new Error("Razorpay is not configured.");
  if (keyId.startsWith("rzp_live_") && process.env.RAZORPAY_ALLOW_LIVE !== "true") throw new Error("Live payments are disabled.");
  return { keyId, keySecret };
}

export function getRazorpay() {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
