import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import NotificationModel from "@/lib/models/Notification";
import { findUserByEmail } from "@/lib/users";

/**
 * Real notification system. DB-ONLY, FAIL-LOUD: every notification is persisted
 * to MongoDB (an in-app record the recipient actually sees). If — and only if —
 * an email provider is configured (RESEND_API_KEY + NOTIFICATION_FROM_EMAIL), a
 * real email is ALSO sent and its outcome recorded. We never claim an email was
 * sent when it wasn't: with no provider, emailStatus stays "skipped".
 */

export type EmailStatus = "skipped" | "sent" | "failed";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  emailStatus: EmailStatus;
  meta: Record<string, unknown>;
  createdAt: string;
}

function docToNotification(doc: any): Notification {
  return {
    id: String(doc._id ?? doc.id),
    userId: doc.userId,
    type: doc.type,
    title: doc.title,
    body: doc.body ?? "",
    read: Boolean(doc.read),
    emailStatus: (doc.emailStatus ?? "skipped") as EmailStatus,
    meta: (doc.meta as Record<string, unknown>) ?? {},
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

/**
 * Send a real email via the Resend HTTP API (no extra dependency). Returns
 * "skipped" when no provider is configured — the honest state, not a fake send.
 */
async function deliverEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailStatus> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!key || !from || !to) return "skipped";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  /** Recipient email — only used to attempt a real email when configured. */
  email?: string;
  meta?: Record<string, unknown>;
}

/** Persist an in-app notification and (if configured) deliver a real email. */
export async function notify(input: NotifyInput): Promise<Notification> {
  requireDatabase();
  await connectToDatabase();
  const emailStatus = input.email
    ? await deliverEmail(
        input.email,
        input.title,
        `<p>${input.body ?? input.title}</p>`
      )
    : "skipped";
  const doc = await NotificationModel.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    emailStatus,
    meta: input.meta ?? {},
  });
  return docToNotification(doc.toObject());
}

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  requireDatabase();
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId };
  if (opts.unreadOnly) filter.read = false;
  const docs = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 50)
    .lean();
  return docs.map(docToNotification);
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  requireDatabase();
  await connectToDatabase();
  return NotificationModel.countDocuments({ userId, read: false });
}

/** Mark a notification read — scoped to its owner so users can't touch others'. */
export async function markNotificationRead(
  id: string,
  userId: string
): Promise<boolean> {
  requireDatabase();
  await connectToDatabase();
  const res = await NotificationModel.updateOne(
    { _id: id, userId },
    { read: true }
  ).catch(() => null);
  return Boolean(res && res.matchedCount > 0);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  requireDatabase();
  await connectToDatabase();
  const res = await NotificationModel.updateMany(
    { userId, read: false },
    { read: true }
  ).catch(() => null);
  return res ? res.modifiedCount : 0;
}

/**
 * Notify every admin (each user whose email is in ADMIN_EMAILS and who has a real
 * account). Used for events admins must action, e.g. a new wholesaler application.
 */
export async function notifyAdmins(
  input: Omit<NotifyInput, "userId" | "email">
): Promise<void> {
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const email of emails) {
    const admin = await findUserByEmail(email);
    if (admin) {
      await notify({ userId: admin.id, email: admin.email, ...input });
    }
  }
}
