/**
 * Notification Dispatcher
 *
 * The single hub all domain services call.
 * Fire-and-forget: never throws, never blocks the UI.
 */

export type EventType =
  | "lead_assigned"
  | "stage_changed"
  | "deal_won"
  | "invoice_generated"
  | "referral_conversion"
  | "payout_processed"
  | "task_due"
  | "task_overdue";

export async function dispatch(event_type: EventType, data: Record<string, any>): Promise<void> {
  try {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, data }),
    }).catch((err) => console.warn("[dispatch] Failed to send notification:", err));
  } catch (e) {
    // Intentionally swallowed — notifications must never break the main flow
    console.warn("[dispatch] Unexpected error:", e);
  }
}
