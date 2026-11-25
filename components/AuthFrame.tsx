import { CalendarCheck, Wallet, Wifi, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/mock";

const POINTS: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Wifi, t: "Office-network attendance", d: "Check in and out from the office, or from home with HR approval." },
  { icon: CalendarCheck, t: "Leave and calendar in one place", d: "Balances, approvals, holidays and WFH days at a glance." },
  { icon: Wallet, t: "Payroll without spreadsheets", d: "Salary runs use attendance and unpaid leave automatically." },
];

export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#ff4b2b] via-[#e11d48] to-[#9f1239] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="CoinHR" className="h-10 w-10 rounded-xl bg-white p-1 object-contain shadow-sm" />
          <span className="text-xl font-bold tracking-tight text-white">{BRAND}</span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-semibold leading-tight">Run attendance, leave and salary from one calm dashboard.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15"><p.icon className="h-5 w-5" /></span>
                <div><p className="font-medium">{p.t}</p><p className="text-sm text-indigo-100">{p.d}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Built for growing teams.</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
      </div>
      <div className="flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
