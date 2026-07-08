import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/users";
import { createSession, hashPassword, publicUserWithRole } from "@/lib/auth";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // Throttle mass account creation / email-enumeration probing.
  const limited = enforceRateLimit(request, "signup", 5, 60 * 60 * 1000);
  if (limited) return limited;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const nameErr = validateName(body?.name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  const emailErr = validateEmail(body?.email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const passErr = validatePassword(body?.password);
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });

  const existing = await findUserByEmail(body.email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(body.password);
  const user = await createUser({
    name: body.name,
    email: body.email,
    passwordHash,
  });

  await createSession(user);
  return NextResponse.json({ user: publicUserWithRole(user) }, { status: 201 });
}
