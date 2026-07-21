import { NextResponse } from "next/server";
import { createFirebaseSession, firebaseAuthEnabled } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

/**
 * Firebase session exchange. The client signs in with the Firebase JS SDK, then
 * POSTs the resulting ID token here; we verify it and mint an httpOnly session
 * cookie (Admin SDK) so server components, API routes, and middleware all see the
 * user. Node runtime — the Admin SDK is not Edge-compatible.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!firebaseAuthEnabled) {
    return NextResponse.json(
      { error: "Firebase authentication is not enabled." },
      { status: 501 }
    );
  }
  // Throttle token-exchange attempts per client.
  const limited = enforceRateLimit(request, "session", 20, 5 * 60 * 1000);
  if (limited) return limited;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idToken = body?.idToken;
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing ID token." }, { status: 400 });
  }

  try {
    const user = await createFirebaseSession(idToken);
    return NextResponse.json({ user });
  } catch {
    // Generic message — never leak whether the token was expired vs malformed.
    return NextResponse.json(
      { error: "Could not establish a session. Please sign in again." },
      { status: 401 }
    );
  }
}
