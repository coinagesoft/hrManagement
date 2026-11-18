"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Check, CircleCheck, House, UserCheck, Users, UserX, X } from "lucide-react";
import { Avatar, Badge, Btn, Card, CardHeader, PageHeader, StatCard, StatusBadge, Progress } from "@/components/ui";
import { useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";
import { HOLIDAYS, PEOPLE, TEAM_LEAVES, TEAM_TODAY, TEAM_WFH, WHO } from "@/lib/mock";
import { fmtShort, TODAY, iso } from "@/lib/dates";

const WEEK = [
  { d: "Mon", p: 8, w: 2, l: 1, a: 0 }, { d: "Tue", p: 7, w: 2, l: 1, a: 1 }, { d: "Wed", p: 9, w: 1, l: 1, a: 0 },
  { d: "Thu", p: 8, w: 1, l: 2, a: 0 }, { d: "Fri", p: 6, w: 3, l: 2, a: 0 },
];

export default function ManagerDashboard() {
  const role = useRole();
  const toast = useToast();
  const [done, setDone] = useState<Record<string, string>>({});
  const pendingLeaves = TEAM_LEAVES.filter((l) => l.status === "Pending");
  const pendingWfh = TEAM_WFH.filter((w) => w.status === "Pending");
  const active = PEOPLE.filter((p) => p.status === "Active").length;
  const present = TEAM_TODAY.filter((t) => t.status === "Present" || t.status === "Late").length;
  const wfh = TEAM_TODAY.filter((t) => t.mode === "WFH").length;
  const onLeave = TEAM_TODAY.filter((t) => t.status === "On leave");
  const holidays = HOLIDAYS.filter((h) => h.date >= iso(TODAY)).slice(0, 3);

  const act = (id: string, what: "Approved" | "Rejected", who: string) => {
    setDone((d) => ({ ...d, [id]: what }));
    toast(`${what}: ${who}`);
  };

  const rows = [
    ...pendingLeaves.map((l) => ({ id: l.id, who: l.who, kind: "Leave", text: `${l.type} leave, ${fmtShort(l.from)}${l.from !== l.to ? " to " + fmtShort(l.to) : ""} (${l.days}d)` })),
    ...pendingWfh.map((w) => ({ id: w.id, who: w.who, kind: "WFH", text: `Work from home, ${fmtShort(w.date)}` })),
  ];

  return (
    <>
      <PageHeader title={`Good morning, ${WHO[role === "hr" ? "hr" : "admin"].name.split(" ")[0]}`} desc="Tuesday, 17 November 2026. Here is how your team is doing today."
        actions={<><Link href={`/${role}/employees`}><Btn variant="outline" icon={Users}>Employees</Btn></Link><Link href={`/${role}/payroll`}><Btn>Run payroll</Btn></Link></>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total employees" value={active} icon={Users} hint="1 deactivated this quarter" />
        <StatCard label="Present today" value={present} icon={UserCheck} tone="green" hint={`${Math.round((present / active) * 100)}% of the team`} />
        <StatCard label="On leave" value={onLeave.length} icon={UserX} tone="indigo" hint="Approved leave today" />
        <StatCard label="Working from home" value={wfh} icon={House} tone="teal" hint="Approved WFH today" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pending approvals" desc="Leave and WFH requests waiting for you"
            action={<Badge tone="amber">{rows.filter((r) => !done[r.id]).length} open</Badge>} />
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={r.who} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.who} <Badge tone={r.kind === "WFH" ? "teal" : "blue"}>{r.kind}</Badge></p>
                    <p className="text-sm text-slate-500">{r.text}</p>
                  </div>
                </div>
                {done[r.id] ? <StatusBadge s={done[r.id]} /> : (
                  <div className="flex gap-2">
                    <Btn size="sm" variant="outline" icon={X} onClick={() => act(r.id, "Rejected", r.who)}>Reject</Btn>
                    <Btn size="sm" variant="success" icon={Check} onClick={() => act(r.id, "Approved", r.who)}>Approve</Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Out today" desc="On approved leave" />
          <ul className="space-y-3 p-5">
            {onLeave.map((p) => (
              <li key={p.name} className="flex items-center gap-3"><Avatar name={p.name} /><div><p className="text-sm font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.dept}</p></div></li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upcoming holidays</p>
            {holidays.map((h) => (
              <p key={h.id} className="mt-2 flex justify-between text-sm text-slate-700"><span>{h.name}</span><span className="text-slate-500">{fmtShort(h.date)}</span></p>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className={role === "admin" ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader title="Attendance this week" desc="Headcount by day" action={
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Office</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-teal-400" />WFH</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-indigo-400" />Leave</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-400" />Absent</span>
            </div>} />
          <div className="flex h-56 items-end gap-6 px-6 pb-5 pt-6">
            {WEEK.map((d) => {
              const tot = d.p + d.w + d.l + d.a;
              const seg = (n: number, c: string) => n > 0 && <div className={c} style={{ height: `${(n / tot) * 100}%` }} />;
              return (
                <div key={d.d} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full w-full max-w-14 flex-col-reverse overflow-hidden rounded-md">
                    {seg(d.p, "bg-emerald-500")}{seg(d.w, "bg-teal-400")}{seg(d.l, "bg-indigo-400")}{seg(d.a, "bg-rose-400")}
                  </div>
                  <span className="text-xs text-slate-500">{d.d}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {role === "admin" && (
          <Card>
            <CardHeader title="Set up your company" desc="3 of 5 steps done" />
            <div className="px-5 pt-4"><Progress value={60} tone="bg-emerald-500" /></div>
            <ul className="space-y-3 p-5 text-sm">
              {[
                ["Add your HR team", true, "employees"], ["Register office network", true, "settings"], ["Set leave policy", true, "leave-policy"],
                ["Add company holidays", false, "holidays"], ["Review role access", false, "permissions"],
              ].map(([t, d, href]) => (
                <li key={String(t)}>
                  <Link href={`/admin/${href}`} className="flex items-center gap-2.5 text-slate-700 hover:text-indigo-700">
                    {d ? <CircleCheck className="h-5 w-5 text-emerald-500" /> : <span className="h-5 w-5 rounded-full border-2 border-slate-300" />}
                    <span className={d ? "text-slate-400 line-through" : ""}>{String(t)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader title="Not checked in yet" desc="Active employees without a check-in or approved leave" action={<CalendarClock className="h-4 w-4 text-slate-400" />} />
        <p className="px-5 py-4 text-sm text-slate-600">Everyone has checked in or is on approved leave. Late arrivals today: <span className="font-medium">{TEAM_TODAY.filter((t) => t.status === "Late").map((t) => t.name).join(", ") || "none"}</span>.</p>
      </Card>
    </>
  );
}
