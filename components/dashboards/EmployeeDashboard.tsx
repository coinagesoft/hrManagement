"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, House, LogIn, LogOut, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { Badge, Btn, Card, CardHeader, Notice, PageHeader, Progress } from "@/components/ui";
import { inputCls, useToast } from "@/components/interactive";
import { BALANCES, HOLIDAYS, SALARIES, calcPay } from "@/lib/mock";
import { fmtDate, fmtINR, fmtShort, iso, pad, TODAY } from "@/lib/dates";

type Mode = "office" | "outside" | "wfh";
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function EmployeeDashboard() {
  const toast = useToast();
  const [now, setNow] = useState<Date | null>(null);
  const [mode, setMode] = useState<Mode>("office");
  const [inAt, setInAt] = useState<Date | null>(null);
  const [outAt, setOutAt] = useState<Date | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";
  const net = {
    office: { icon: Wifi, tone: "green" as const, title: "Connected to office network", sub: "Pune Office (203.0.113.10)" },
    outside: { icon: WifiOff, tone: "rose" as const, title: "Not on the office network", sub: "Your IP: 49.36.118.22" },
    wfh: { icon: House, tone: "teal" as const, title: "Approved work from home today", sub: "Network check is skipped for approved WFH days" },
  }[mode];

  function checkIn() {
    if (mode === "outside") { setBlocked(true); return; }
    setBlocked(false); setInAt(new Date()); setOutAt(null);
    toast(mode === "wfh" ? "Checked in (WFH)" : "Checked in from office network");
  }
  function checkOut() {
    if (mode === "outside") { setBlocked(true); return; }
    setOutAt(new Date()); toast("Checked out. Have a good evening!");
  }
  const worked = inAt && outAt ? Math.max(0, Math.round((+outAt - +inAt) / 60000)) : 0;

  const me = SALARIES[1];
  const pay = calcPay(me);
  const holidays = HOLIDAYS.filter((h) => h.date >= iso(TODAY)).slice(0, 3);
  const month = [["Present", 10, "bg-emerald-500"], ["Late", 1, "bg-amber-500"], ["Leave", 3, "bg-indigo-500"], ["WFH", 1, "bg-teal-500"], ["Absent", 0, "bg-rose-500"]] as const;

  return (
    <>
      <PageHeader title="Good morning, Rohan" desc="Tuesday, 17 November 2026" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Today&apos;s attendance</p>
                <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-slate-900">{clock}</p>
                <p className="mt-1 text-sm text-slate-500">Shift 09:30 to 18:30, grace 15 min</p>
              </div>
              <div className="text-right">
                {!inAt && <Badge tone="slate" dot>Not checked in</Badge>}
                {inAt && !outAt && <Badge tone="green" dot>Working since {hhmm(inAt)}</Badge>}
                {inAt && outAt && <Badge tone="blue" dot>Day complete, {Math.floor(worked / 60)}h {pad(worked % 60)}m</Badge>}
              </div>
            </div>

            <div className={`mt-5 flex items-start gap-3 rounded-lg p-3.5 ring-1 ring-inset ${mode === "office" ? "bg-emerald-50 ring-emerald-600/20" : mode === "wfh" ? "bg-teal-50 ring-teal-600/20" : "bg-rose-50 ring-rose-600/20"}`}>
              <net.icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="text-sm font-medium">{net.title}</p><p className="text-xs opacity-80">{net.sub}</p></div>
            </div>

            {blocked && (
              <div className="mt-4">
                <Notice tone="rose" icon={ShieldAlert}>
                  Check-in is allowed only from the office network. <Link href="/employee/wfh" className="font-medium underline">Request WFH</Link> or contact HR if you are working from the office.
                </Notice>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Btn icon={LogIn} className="px-6 py-2.5" disabled={!!inAt} onClick={checkIn}>Check in</Btn>
              <Btn icon={LogOut} variant="outline" className="px-6 py-2.5" disabled={!inAt || !!outAt} onClick={checkOut}>Check out</Btn>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Demo only:</span> simulate
            <select className={`${inputCls} !w-auto !py-1`} value={mode} onChange={(e) => { setMode(e.target.value as Mode); setBlocked(false); }}>
              <option value="office">On office WiFi</option>
              <option value="outside">Outside the office</option>
              <option value="wfh">Approved WFH day</option>
            </select>
          </div>
        </Card>

        <Card>
          <CardHeader title="Leave balance" action={<Link href="/employee/leave" className="text-sm font-medium text-indigo-600">Apply</Link>} />
          <ul className="space-y-5 p-5">
            {BALANCES.map((b) => {
              const left = b.allocated - b.used - b.pending;
              return (
                <li key={b.type}>
                  <div className="mb-1.5 flex items-baseline justify-between"><span className="text-sm font-medium text-slate-800">{b.type}</span><span className="text-sm text-slate-500"><b className="text-slate-900">{left}</b> of {b.allocated} left</span></div>
                  <Progress value={((b.used + b.pending) / b.allocated) * 100} />
                  {b.pending > 0 && <p className="mt-1 text-xs text-amber-700">{b.pending} days pending approval</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="This month" desc="1 to 17 November" />
          <ul className="space-y-3 p-5">
            {month.map(([l, n, c]) => (
              <li key={l} className="flex items-center gap-3 text-sm"><i className={`h-2.5 w-2.5 rounded-full ${c}`} /><span className="flex-1 text-slate-600">{l}</span><span className="font-medium text-slate-900">{n}</span></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Upcoming holidays" action={<Link href="/employee/calendar" className="text-sm font-medium text-indigo-600">Calendar</Link>} />
          <ul className="space-y-3 p-5">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm"><span className="text-slate-800">{h.name}</span><span className="text-slate-500">{fmtShort(h.date)}</span></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Latest payslip" action={<Link href="/employee/payslips" className="text-sm font-medium text-indigo-600">All</Link>} />
          <div className="p-5">
            <p className="text-sm text-slate-500">October 2026</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{fmtINR(pay.net)}</p>
            <p className="mt-1 text-xs text-slate-500">Paid on {fmtDate("2026-10-31")}</p>
            <Btn variant="outline" size="sm" icon={Download} className="mt-4" onClick={() => toast("Payslip download started")}>Download PDF</Btn>
          </div>
        </Card>
      </div>
    </>
  );
}
