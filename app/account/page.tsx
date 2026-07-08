import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My account</h1>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                {user.role}
              </span>
              {user.isWholesaler ? (
                <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Wholesale account
                </span>
              ) : user.wholesaleStatus === "pending" ? (
                <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Wholesale · pending review
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card
          title="Your orders"
          body="View your order history, status, and details."
          cta={["View orders", "/account/orders"]}
        />
        <Card
          title="Continue shopping"
          body="Browse the catalog and add items to your cart."
          cta={["Go to cart", "/cart"]}
        />
        <Card
          title={user.isWholesaler ? "Business account" : "TechStore Business"}
          body={
            user.isWholesaler
              ? "You're an approved wholesaler — wholesale pricing is applied at checkout."
              : "Buying in bulk? Apply for wholesale pricing across the catalog."
          }
          cta={[user.isWholesaler ? "View details" : "Apply for wholesale", "/business"]}
        />
      </div>

      {!hasDatabase && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Dev note: no MONGODB_URI is configured, so this account lives in an
          in-memory store and will reset when the server restarts. Set
          MONGODB_URI for persistent accounts.
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: [string, string];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
      <Link
        href={cta[1]}
        className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
      >
        {cta[0]} →
      </Link>
    </div>
  );
}
