"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck, Loader2 } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { Btn } from "@/components/ui";
import { Field, inputCls } from "@/components/interactive";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process request");

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>

      {sent ? (
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Check your email</h1>
          <p className="text-sm text-slate-600">
            We sent a password reset link to <b>{email}</b> via our mail server. Please check your inbox and follow the instructions.
          </p>
          <div className="pt-4">
            <Link href="/login" className="btn w-full text-center block">
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your work email address and we will dispatch a secure reset link.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Field label="Work email">
              <input
                className={inputCls}
                type="email"
                required
                placeholder="you@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Btn type="submit" disabled={loading} className="w-full justify-center">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </Btn>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
