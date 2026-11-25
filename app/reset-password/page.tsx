"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Lock, Loader2, ArrowLeft } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { Btn, FullPageLoader, CoinHRLoader } from "@/components/ui";
import { Field, inputCls } from "@/components/interactive";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setErrorMessage("No reset token provided in URL.");
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setEmail(data.email);
        } else {
          setErrorMessage(data.error || "Invalid or expired password reset link.");
        }
      })
      .catch(() => {
        setErrorMessage("Network error while validating link.");
      })
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <FullPageLoader title="Validating password reset token..." subtitle="Verifying cryptographic token security." />
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <span className="inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Password Reset Complete!
        </h1>
        <p className="text-sm text-slate-600">
          Your account password has been updated in our database. You can now log in securely.
        </p>
        <div className="pt-4">
          <Link href="/login" className="btn w-full text-center block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Link Invalid or Expired
        </h1>
        <p className="text-sm text-rose-600 font-medium">{errorMessage}</p>
        <div className="pt-4">
          <Link href="/forgot-password" className="btn w-full text-center block">
            Request a New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set new password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Resetting password for <b>{email}</b>.
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="New password">
          <input
            className={inputCls}
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm new password">
          <input
            className={inputCls}
            type="password"
            required
            minLength={8}
            placeholder="Re-type your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Btn type="submit" disabled={submitting} className="w-full justify-center">
          {submitting ? (
            <>
              <CoinHRLoader size={16} variant="spin" className="mr-2 text-white" /> Saving password...
            </>
          ) : (
            "Update Password"
          )}
        </Btn>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthFrame>
      <Suspense
        fallback={
          <FullPageLoader title="Loading..." />
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </AuthFrame>
  );
}
