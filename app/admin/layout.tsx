import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · TechStore" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          You're signed in as {user.email}, which doesn't have admin access. Ask
          an administrator to add your email to <code>ADMIN_EMAILS</code>.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Admin
            </span>
            <span className="text-sm text-slate-400">TechStore</span>
          </div>
          <AdminNav />
          <Link
            href="/"
            className="mt-4 block text-sm font-medium text-brand-600 hover:underline"
          >
            ← Back to store
          </Link>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
