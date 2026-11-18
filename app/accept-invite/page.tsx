"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function AcceptInvitePage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const s = strength(pw);
  const ok = pw.length >= 8 && pw === pw2;
  return (
    <AuthFrame>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to the team</h1>
      <p className="mt-1 text-sm text-slate-500">You have been invited to Acme Technologies Pvt Ltd. Set a password to activate your account.</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) router.push("/login"); }}>
        <Field label="New password" hint="At least 8 characters."><input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Progress value={s} tone={s < 60 ? "bg-rose-500" : s < 100 ? "bg-amber-500" : "bg-emerald-500"} />
        <Field label="Confirm password"><input className={inputCls} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        {pw2 && pw !== pw2 && <p className="text-sm text-rose-600">Passwords do not match.</p>}
        <Btn type="submit" disabled={!ok} className="w-full">Activate account</Btn>
      </form>
    </AuthFrame>
  );
}
