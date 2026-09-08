type InvoiceAccessInput = { userId?: string | null; isAdmin: boolean; customerId?: string | null; token?: string | null; confirmationToken: string };

export function canAccessInvoice({ userId, isAdmin, customerId, token, confirmationToken }: InvoiceAccessInput) {
  if (isAdmin) return true;
  if (userId && customerId && userId === customerId) return true;
  return Boolean(token && token === confirmationToken);
}
