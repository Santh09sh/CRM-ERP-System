import { dispatch } from "@/lib/notification-dispatcher";

/**
 * Task Service
 * Fires task_due and task_overdue notification events.
 * Called from /api/tasks/reminders/route.ts.
 */

export async function fireTaskDue(task: {
  title: string;
  lead_name?: string;
  due_date: string;
  recipient_email?: string;
  recipient_phone?: string;
}) {
  dispatch("task_due", {
    title: task.title,
    lead_name: task.lead_name,
    due_date: task.due_date,
    email: task.recipient_email,
    phone: task.recipient_phone,
  });
}

export async function fireTaskOverdue(task: {
  title: string;
  lead_name?: string;
  due_date: string;
  recipient_email?: string;
  recipient_phone?: string;
}) {
  dispatch("task_overdue", {
    title: task.title,
    lead_name: task.lead_name,
    due_date: task.due_date,
    email: task.recipient_email,
    phone: task.recipient_phone,
  });
}
