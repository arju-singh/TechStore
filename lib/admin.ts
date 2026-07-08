import "server-only";

/**
 * Admin access is granted by email via the ADMIN_EMAILS env var (comma-separated).
 * This keeps promotion config-driven — no database write needed to make someone
 * an admin, which matters for the in-memory dev store.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
