"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/authClient";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const redirectTo = params.get("redirect") || "/account";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) await signup(name, email, password);
      else await login(email, password);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSignup
            ? "Sign up to check out faster and track your orders."
            : "Log in to your TechStore account."}
        </p>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <Field
              label="Full name"
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
              placeholder="Priya Sharma"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : isSignup
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignup ? "Already have an account? " : "New to TechStore? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-brand-600 hover:underline"
          >
            {isSignup ? "Log in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
