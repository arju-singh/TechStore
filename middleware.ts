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

/** Verify the session cookie and return its JWT claims, or null if invalid. */
async function sessionPayload(
  req: NextRequest
): Promise<Record<string, unknown> | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null; // expired / tampered / invalid
  }
}

function isAdminPayload(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  if (payload.role === "admin") return true;
  const email = typeof payload.email === "string" ? payload.email : "";
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  const isVendorApi = pathname.startsWith("/api/vendor");
  const isVendorPage = pathname.startsWith("/vendor");
  // Wholesale portal (not the public /become-a-wholesaler landing) + its APIs.
  const isWholesaleApi =
    pathname.startsWith("/api/wholesale") ||
    pathname.startsWith("/api/wholesaler");
  const isWholesalePage = pathname.startsWith("/wholesale");
  if (
    !isAdminApi &&
    !isAdminPage &&
    !isVendorApi &&
    !isVendorPage &&
    !isWholesaleApi &&
    !isWholesalePage
  ) {
    return NextResponse.next();
  }

  const payload = await sessionPayload(req);

  // Admin surfaces: require an admin session (authoritative re-check still runs
  // in each handler/layout — this is defense-in-depth).
  if (isAdminApi || isAdminPage) {
    if (isAdminPayload(payload)) return NextResponse.next();
    if (isAdminApi) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vendor + wholesale surfaces: require any logged-in session at the edge.
  // Whether the user owns an APPROVED vendor / wholesaler profile is decided
  // authoritatively by the layout/handlers (getVendorUser / getWholesalerUser).
  if (payload) return NextResponse.next();
  if (isVendorApi || isWholesaleApi) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/vendor/:path*",
    "/api/vendor/:path*",
    "/wholesale/:path*",
    "/api/wholesale/:path*",
    "/api/wholesaler/:path*",
  ],
};
