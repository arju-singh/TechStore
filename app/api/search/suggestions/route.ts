import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/products";
import { enforceRateLimit } from "@/lib/rateLimit";

// Autocomplete for the search box: GET /api/search/suggestions?q=mac
// Public and cache-friendly (depends only on the query string, no auth/cookies).
// Generated per-request against the live catalog.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Generous ceiling — the client debounces keystrokes, so normal typing stays
  // well under this; it only bites on abusive bursts.
  const limited = enforceRateLimit(request, "search-suggest", 60, 10_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 100);

  try {
    const suggestions = await getSearchSuggestions(q, { productLimit: 6 });
    return NextResponse.json(suggestions, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch {
    // Never let a transient data error break typing — degrade to empty results.
    return NextResponse.json(
      { query: q, products: [], categories: [], brands: [], trending: [] },
      { status: 200 }
    );
  }
}
