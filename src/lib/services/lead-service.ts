import { updateLead } from "@/lib/db";
import { dispatch } from "@/lib/notification-dispatcher";

/**
 * Lead Service
 * All lead mutations + associated notification events live here.
 * Pages import from this service, never call db.ts + notify() separately.
 */

export async function assignLead(
  leadId: string,
  assignedToUserId: string,
  leadData: { title: string; source?: string; estimated_value?: number },
  assignedToName?: string,
  recipientEmail?: string,
  recipientPhone?: string
) {
  await updateLead(leadId, { assigned_to: assignedToUserId });
  dispatch("lead_assigned", {
    title: leadData.title,
    source: leadData.source,
    estimated_value: leadData.estimated_value || 0,
    assigned_to_name: assignedToName || "a team member",
    email: recipientEmail,
    phone: recipientPhone,
  });
}

export async function changeStage(
  leadId: string,
  newStageId: string,
  leadData: { title: string },
  stageNames: { old: string; new: string },
  recipientEmail?: string
) {
  await updateLead(leadId, { stage_id: newStageId, updated_at: new Date().toISOString() });
  dispatch("stage_changed", {
    title: leadData.title,
    old_stage: stageNames.old,
    new_stage: stageNames.new,
    email: recipientEmail,
  });
}
