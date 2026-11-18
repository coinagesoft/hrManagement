"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.redirectTo || "/employee");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Invalid credentials or network issue.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      {/* Brand Side Panel */}
      <section className="hidden flex-col justify-between bg-pine p-12 text-white md:flex">
        <div className="flex items-center gap-2.5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-pine">H</span>
          <span>HR Platform</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Attendance, leave and salary, without the spreadsheets.
          </h1>
          <p className="mt-4 max-w-sm text-white/80">
            Check in from the office network, request leave in a minute, and see your payslip as soon as it is paid.
          </p>
          <div className="mt-8 rounded-lg bg-white/10 p-4 max-w-sm text-sm">
            <p className="font-semibold text-white">Database Connected</p>
            <p className="text-white/80 text-xs mt-1">Hostinger MySQL: <code className="bg-black/20 px-1 py-0.5 rounded">u856729253_coinhr</code></p>
          </div>
        </div>
        <p className="text-sm text-white/70">Each company works in its own private space.</p>
      </section>

      {/* Form Section */}
      <section className="grid place-items-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-mute">
            Enter your credentials to access your workspace.
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Authenticated! Redirecting to dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="pw">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-pine hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="pw"
                type="password"
                required
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <p className="text-center text-sm text-mute pt-2">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-pine font-medium underline">
                Register here
              </Link>
            </p>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-8 rounded-lg bg-canvas p-4 text-xs text-mute border border-line">
            <p className="mb-2 font-medium text-ink">Demo Accounts (Click to auto-fill):</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("superadmin@coinhr.com")}
                className="rounded border border-line bg-white px-2 py-1.5 text-left hover:border-pine hover:text-pine transition"
              >
                <span className="font-semibold block text-ink">Super Admin</span>
                <span className="text-[10px] text-mute block truncate">superadmin@coinhr.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("aarav@acme.com")}
                className="rounded border border-line bg-white px-2 py-1.5 text-left hover:border-pine hover:text-pine transition"
              >
                <span className="font-semibold block text-ink">Admin (Owner)</span>
                <span className="text-[10px] text-mute block truncate">aarav@acme.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("priya@acme.com")}
                className="rounded border border-line bg-white px-2 py-1.5 text-left hover:border-pine hover:text-pine transition"
              >
                <span className="font-semibold block text-ink">HR Manager</span>
                <span className="text-[10px] text-mute block truncate">priya@acme.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("rohan@acme.com")}
                className="rounded border border-line bg-white px-2 py-1.5 text-left hover:border-pine hover:text-pine transition"
              >
                <span className="font-semibold block text-ink">Employee</span>
                <span className="text-[10px] text-mute block truncate">rohan@acme.com</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-mute italic text-center">Password: Password123!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
