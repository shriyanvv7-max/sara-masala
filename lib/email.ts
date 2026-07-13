import "server-only";
export type EmailName = "order-confirmation" | "payment-failed" | "order-packed" | "order-shipped" | "order-delivered" | "refund-processed" | "admin-new-order";
export async function sendEmail(name: EmailName, to: string, data: Record<string, unknown>) { if (!process.env.EMAIL_PROVIDER) { if (process.env.NODE_ENV !== "production") console.info(`[email:${name}]`, { to, data }); return { sent: false }; } /* Provider adapter belongs here when configured. */ return { sent: false }; }
