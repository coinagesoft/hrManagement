"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { Btn, Progress } from "@/components/ui";
import { Field, inputCls } from "@/components/interactive";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s += 40;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s += 20;
  if (/\d/.test(p)) s += 20;
  if (/[^A-Za-z0-9]/.test(p)) s += 20;
  return s;
}

interface InviteDetails {
  email: string;
  userName: string;
  companyName: string;
  role: string;
  department?: string;
  title?: string;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No invitation token found in the URL. Please check your invitation email.");
      return;
    }

    fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setInvite(data);
        } else {
          setError(data.error || "Invalid invitation link.");
        }
      })
      .catch(() => {
        setError("Unable to connect to the server. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const s = strength(pw);
  const ok = pw.length >= 8 && pw === pw2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || submitting || !token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate account.");
      }

      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      setActivated(true);
      setTimeout(() => {
        router.push(data.redirectTo || (invite?.role ? `/${invite.role}` : "/employee"));
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to activate account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthFrame>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pine mb-4" />
          <h2 className="text-lg font-semibold">Verifying your invitation...</h2>
          <p className="text-sm text-slate-500 mt-1">Checking with the platform database.</p>
        </div>
      </AuthFrame>
    );
  }

  if (error && !valid) {
    return (
      <AuthFrame>
        <div className="py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Invitation Problem</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-8 flex gap-3">
            <Link href="/login" className="btn w-full">
              Back to Sign in
            </Link>
          </div>
        </div>
      </AuthFrame>
    );
  }

  const roleLower = (invite?.role || "employee").toLowerCase();
  const roleName =
    roleLower === "admin"
      ? "Administrator"
      : roleLower === "hr"
      ? "HR Manager"
      : "Employee";

  if (activated) {
    return (
      <AuthFrame>
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Account Activated!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome aboard, <strong>{invite?.userName}</strong>. Redirecting you straight to your{" "}
            <strong>{roleName} Portal</strong>...
          </p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-pine" />
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified Platform Invitation
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {invite?.userName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {roleLower === "admin" ? (
          <>
            You have been invited to set up and manage <strong>{invite?.companyName}</strong> (
            {invite?.email}). Set a secure password to activate your company and administrator account.
          </>
        ) : roleLower === "hr" ? (
          <>
            You have been invited to join <strong>{invite?.companyName}</strong> as HR Manager (
            {invite?.email}). Set a secure password to activate your account and access your HR portal.
          </>
        ) : (
          <>
            You have been invited to join <strong>{invite?.companyName}</strong> as a team member (
            {invite?.email}). Set a secure password to activate your account and access your employee portal.
          </>
        )}
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Create password" hint="At least 8 characters.">
          <input
            className={inputCls}
            type="password"
            required
            minLength={8}
            placeholder="Choose a strong password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        {pw && (
          <div className="space-y-1">
            <Progress
              value={s}
              tone={s < 60 ? "bg-rose-500" : s < 100 ? "bg-amber-500" : "bg-emerald-500"}
            />
            <p className="text-[11px] text-slate-500">
              {s < 60 ? "Weak password" : s < 100 ? "Good password" : "Strong password"}
            </p>
          </div>
        )}
        <Field label="Confirm password">
          <input
            className={inputCls}
            type="password"
            required
            placeholder="Confirm your password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </Field>
        {pw2 && pw !== pw2 && (
          <p className="text-sm text-rose-600">Passwords do not match.</p>
        )}
        <Btn type="submit" disabled={!ok || submitting} className="w-full mt-2">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Activating account...
            </>
          ) : roleLower === "admin" ? (
            "Activate account & company"
          ) : (
            "Activate account & sign in"
          )}
        </Btn>
      </form>
    </AuthFrame>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthFrame>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pine" />
          </div>
        </AuthFrame>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
