import { createInvoice } from "@/lib/db";
import { dispatch } from "@/lib/notification-dispatcher";

/**
 * Invoice Service
 * Wraps invoice creation and fires invoice_generated notification.
 */

export async function generateInvoice(
  invoice: Record<string, any>,
  items: any[],
  recipientEmail?: string
) {
  const result = await createInvoice(invoice, items);
  dispatch("invoice_generated", {
    invoice_number: result.invoice_number,
    total: Number(result.total || 0),
    company: invoice.company_name || result.company?.name || "N/A",
    email: recipientEmail,
  });
  return result;
}
