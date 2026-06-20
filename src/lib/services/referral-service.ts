import { dispatch } from "@/lib/notification-dispatcher";

/**
 * Referral Service
 * Fires notification events for referral conversions and payout processing.
 * (Referrals page uses sample data; these are ready to wire when DB is connected.)
 */

export async function notifyConversion(data: {
  deal_title: string;
  commission: number;
  ambassador_email?: string;
}) {
  dispatch("referral_conversion", {
    deal_title: data.deal_title,
    commission: data.commission,
    email: data.ambassador_email,
  });
}

export async function notifyPayoutProcessed(data: {
  amount: number;
  ambassador_name: string;
  ambassador_email?: string;
  ambassador_phone?: string;
}) {
  dispatch("payout_processed", {
    amount: data.amount,
    ambassador_name: data.ambassador_name,
    email: data.ambassador_email,
    phone: data.ambassador_phone,
  });
}
