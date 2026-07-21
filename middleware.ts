import { NextRequest, NextResponse } from "next/server";

/**
 * Edge authorization gate for admin / vendor / wholesale surfaces — a
 * defense-in-depth cookie-presence check on top of the authoritative per-handler
 * and per-layout guards (`getAdminUser` / `getVendorUser` / `getWholesalerUser`),
 * which run on the Node runtime and are the real source of truth.
 *
 * The session cookie is a Firebase session cookie (or, on the legacy path, a
 * custom HS256 JWT). NEITHER can be verified here: the Firebase Admin SDK is not
 * Edge-compatible, and doing crypto at the edge for the legacy token buys little
 * now that the two paths coexist. So this layer only checks that a session cookie
 * is PRESENT — enough to bounce anonymous traffic early — and defers "is this
 * user actually an admin / approved vendor / approved wholesaler?" to the Node
 * layouts and route handlers, which already re-check against the database.
 */

const COOKIE_NAME = "techstore_session";

function hasSession(req: NextRequest): boolean {
  return Boolean(req.cookies.get(COOKIE_NAME)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/vendor") ||
    pathname.startsWith("/api/wholesale") ||
    pathname.startsWith("/api/wholesaler");
  const isProtectedPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/wholesale");

  if (!isApi && !isProtectedPage) return NextResponse.next();

  // A present session passes the edge; the Node layout/handler decides whether
  // this user is authorized for the specific surface.
  if (hasSession(req)) return NextResponse.next();

  // Anonymous: block APIs outright, send pages to login with a return path.
  if (isApi) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", pathname);
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
