/**
 * Email allowlist for the single-user gate.
 *
 * Compass is a private personal app: only the emails listed in
 * AUTH_ALLOWED_EMAILS (comma-separated) may sign in. An unset/empty list
 * denies everyone — fail closed rather than open.
 */

function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.toLowerCase());
}
