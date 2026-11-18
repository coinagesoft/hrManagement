"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";
import { Btn } from "@/components/ui";
import { Field, inputCls } from "@/components/interactive";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  return (
    <AuthFrame>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      {sent ? (
        <div>
          <span className="mb-4 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600"><MailCheck className="h-6 w-6" /></span>
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-1 text-sm text-slate-500">If an account exists for that address, we have sent a link to reset your password.</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your work email and we will send you a reset link.</p>
          <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <Field label="Work email"><input className={inputCls} type="email" required placeholder="you@company.com" /></Field>
            <Btn type="submit" className="w-full">Send reset link</Btn>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
