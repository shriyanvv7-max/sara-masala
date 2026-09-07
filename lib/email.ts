import "server-only";
export type EmailName = "order-confirmation" | "payment-failed" | "order-packed" | "order-shipped" | "order-delivered" | "refund-processed" | "admin-new-order";
export const emailSubjects: Record<EmailName, string> = { "order-confirmation": "Your Sara Masala order", "payment-failed": "Your payment could not be completed", "order-packed": "Your spices are packed", "order-shipped": "Your order is on its way", "order-delivered": "Your order has arrived", "refund-processed": "Your refund has been processed", "admin-new-order": "New paid Sara Masala order" };
// Provider adapter: deliberate no-op until a provider is configured and sending is enabled.
export async function sendEmail(name: EmailName, _to: string, _data: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console.info(`[email:${name}] delivery not configured`);
  return { sent: false };
}
