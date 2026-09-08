import "server-only";

export type EmailName =
  | "order-confirmation"
  | "admin-new-order"
  | "order-packed"
  | "order-shipped"
  | "order-out-for-delivery"
  | "order-delivered"
  | "order-cancelled"
  | "refund-processed";

export const emailSubjects: Record<EmailName, string> = {
  "order-confirmation": "Your Sara Masala order is confirmed",
  "admin-new-order": "New paid Sara Masala order",
  "order-packed": "Your Sara Masala order is packed",
  "order-shipped": "Your Sara Masala order is on its way",
  "order-out-for-delivery": "Your Sara Masala order is out for delivery",
  "order-delivered": "Your Sara Masala order has arrived",
  "order-cancelled": "Your Sara Masala order was cancelled",
  "refund-processed": "Your Sara Masala refund has been processed",
};

type SendEmailInput = { name: EmailName; to: string; html: string; subject?: string };

export async function sendEmail({ name, to, html, subject }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Transactional email is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: subject || emailSubjects[name], html }),
  });
  const result = await response.json().catch(() => null) as { id?: string } | null;
  if (!response.ok || !result?.id) throw new Error(`Resend delivery failed (${response.status})`);
  console.info(`[email:${name}] sent`, { provider: "resend", id: result.id });
  return { sent: true, providerId: result.id };
}
