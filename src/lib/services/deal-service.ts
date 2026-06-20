import { updateDeal } from "@/lib/db";
import { dispatch } from "@/lib/notification-dispatcher";

/**
 * Deal Service
 * Wraps deal mutations and fires relevant notification events.
 */

export async function markDealWon(
  dealId: string,
  dealData: { title: string; value: number; company?: string },
  recipientEmail?: string,
  recipientPhone?: string
) {
  await updateDeal(dealId, { status: "won", closed_at: new Date().toISOString() });
  dispatch("deal_won", {
    title: dealData.title,
    value: dealData.value,
    company: dealData.company || "N/A",
    email: recipientEmail,
    phone: recipientPhone,
  });
}

export async function markDealLost(dealId: string) {
  await updateDeal(dealId, { status: "lost", closed_at: new Date().toISOString() });
  // No notification for lost deals (can be added later)
}

export async function updateDealStatus(
  dealId: string,
  status: string,
  dealData: { title: string; value: number; company?: string },
  recipientEmail?: string,
  recipientPhone?: string
) {
  if (status === "won") {
    return markDealWon(dealId, dealData, recipientEmail, recipientPhone);
  }
  if (status === "lost") {
    return markDealLost(dealId);
  }
  await updateDeal(dealId, { status });
}
