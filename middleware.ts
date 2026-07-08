import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Centralized authorization gate for admin surfaces — defense-in-depth on top of
 * the per-handler `getAdminUser()` checks that remain the authoritative guard.
 * Runs at the edge before the route, so a new /admin or /api/admin route is
 * protected even if someone forgets the inline check.
 *
 * Admin is derived from the session JWT's claims only (no DB call here): either
 * the stored role is "admin", or the email is in ADMIN_EMAILS — mirroring
 * lib/auth.ts `publicUserWithRole`. The route handlers still re-check against the
 * database, so this layer never needs to be perfectly authoritative.
 */

const COOKIE_NAME = "techstore_session";

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "dev-insecure-secret-change-me-please-set-AUTH_SECRET";
  return new TextEncoder().encode(secret);
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "admin") return true;
    const email = typeof payload.email === "string" ? payload.email : "";
    return adminEmails().includes(email.trim().toLowerCase());
  } catch {
    return false; // expired / tampered / invalid
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  if (!isApi && !isAdminPage) return NextResponse.next();

  if (await isAdminRequest(req)) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  // Admin page: bounce to login, preserving where they were headed.
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
