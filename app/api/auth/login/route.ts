import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users";
import { createSession, verifyPassword, enrichPublicUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // Throttle credential-stuffing / brute force: 10 attempts / 5 min per client.
  const limited = enforceRateLimit(request, "login", 10, 5 * 60 * 1000);
  if (limited) return limited;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(email);
  // Same generic message whether the email is unknown or the password is wrong,
  // so we don't leak which emails have accounts.
  const invalid = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );
  if (!user) return invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid;

  await createSession(user);
  return NextResponse.json({ user: await enrichPublicUser(user) });
}
