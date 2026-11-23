"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck, Building2, Users, Briefcase } from "lucide-react";

function calculateStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s += 40;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s += 20;
  if (/\d/.test(p)) s += 20;
  if (/[^A-Za-z0-9]/.test(p)) s += 20;
  return s;
}

export default function Register() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
    companyName: "",
    department: "",
    title: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = calculateStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;
  const isFormValid =
    formData.name.trim().length > 1 &&
    formData.email.includes("@") &&
    formData.password.length >= 8 &&
    passwordsMatch &&
    (formData.companyName.trim().length > 0 || formData.role === "employee");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          companyName: formData.companyName.trim() || "Acme Technologies",
          department: formData.department.trim() || undefined,
          title: formData.title.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register account.");
      }

      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(data.redirectTo || `/${formData.role}`);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
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
            Get started with dynamic, database-backed HR.
          </h1>
          <p className="mt-4 max-w-sm text-white/80">
            Create an organization, onboard employees, automate leave policies, and calculate salaries directly synced to Hostinger MySQL.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-sm">Real MySQL Database</p>
                <p className="text-xs text-white/70">Connected securely to u856729253_coinhr</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-sm">Multi-tenant Company Spaces</p>
                <p className="text-xs text-white/70">Each company operates in its own isolated workspace</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-sm">Role-Based Access Control</p>
                <p className="text-xs text-white/70">Super Admin, Company Admin, HR, and Employee tiers</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-white/70">Encrypted credentials with salted bcrypt hashes.</p>
      </section>

      {/* Form Container */}
      <section className="flex items-center justify-center bg-white p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="mt-1 text-sm text-mute">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-pine underline">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Registration successful! Redirecting to your dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="label">I am joining as</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "admin", label: "Admin", sub: "Company owner" },
                  { id: "hr", label: "HR", sub: "Manager" },
                  { id: "employee", label: "Employee", sub: "Staff" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`rounded-lg border p-2.5 text-center text-xs transition cursor-pointer ${
                      formData.role === r.id
                        ? "border-pine bg-pine-soft font-semibold text-pine"
                        : "border-line bg-white text-ink hover:bg-canvas"
                    }`}
                  >
                    <div className="font-medium">{r.label}</div>
                    <div className="text-[10px] text-mute">{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="label" htmlFor="name">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                className="field"
                placeholder="e.g. Aarav Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">
                Work email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="label" htmlFor="companyName">
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                required
                className="field"
                placeholder="e.g. Acme Technologies"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>

            {/* Department and Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  className="field"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="title">
                  Job title
                </label>
                <input
                  id="title"
                  type="text"
                  className="field"
                  placeholder="e.g. Lead Engineer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="pw">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="pw"
                type="password"
                required
                minLength={8}
                className="field"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && (
                <div className="mt-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength < 60 ? "bg-rose-500" : strength < 100 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(strength, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-mute">
                    {strength < 60 ? "Weak password" : strength < 100 ? "Medium strength" : "Strong password"}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="pw2">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <input
                id="pw2"
                type="password"
                required
                className="field"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              {formData.confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-rose-600">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="btn w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-4 text-center text-xs text-mute">
            By signing up, you agree to the company security policy and terms.
          </div>
        </div>
      </section>
    </div>
  );
}
