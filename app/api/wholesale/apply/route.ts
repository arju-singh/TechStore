import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyForWholesale } from "@/lib/users";
import { validateBusiness } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rateLimit";

/**
 * Submit (or resubmit) a wholesale application for the signed-in user. Captures
 * business details and marks the account "pending" for admin review. The user's
 * wholesaler status is never granted here — only an admin approval flips it to
 * "approved" (see /api/admin/wholesale).
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "wholesale-apply", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please log in to apply for a wholesale account." },
      { status: 401 }
    );
  }

  if (user.wholesaleStatus === "approved") {
    return NextResponse.json(
      { error: "Your account is already an approved wholesale account." },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateBusiness(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await applyForWholesale(user.id, result.business);
  if (!updated) {
    return NextResponse.json(
      { error: "Could not submit your application. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      status: updated.wholesaleStatus,
      message: "Application received. We'll review it shortly.",
    },
    { status: 201 }
  );
}
