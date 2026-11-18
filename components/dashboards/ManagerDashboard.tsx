"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, House, UserCheck, Users, UserX, X, Loader2 } from "lucide-react";
import { Avatar, Badge, Btn, Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";
import { fmtShort } from "@/lib/dates";

interface DashboardData {
  company: { id: number; name: string; code: string };
  metrics: {
    headcount: number;
    present: number;
    onLeave: number;
    wfh: number;
    absent: number;
    pendingApprovalsCount: number;
  };
  pendingApprovals: {
    id: string;
    rawId: number;
    kind: "Leave" | "WFH";
    who: string;
    dept: string;
    type: string;
    dates: string;
    days?: number;
    reason: string;
  }[];
  outToday: { id: number; name: string; dept: string }[];
  upcomingHolidays: { id: number; name: string; date: string; kind: string }[];
  weekSummary: { d: string; p: number; w: number; l: number; a: number }[];
}

export default function ManagerDashboard() {
  const role = useRole();
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json?.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const act = async (item: DashboardData["pendingApprovals"][0], action: "Approved" | "Rejected") => {
    setActionLoading(item.id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.rawId,
          type: item.kind,
          action,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to submit decision");

      setDecisions((d) => ({ ...d, [item.id]: action }));
      toast(`${action}: ${item.who}`);
      fetchDashboard();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const active = data?.metrics.headcount ?? 12;
  const present = data?.metrics.present ?? 9;
  const onLeaveCount = data?.metrics.onLeave ?? 1;
  const wfh = data?.metrics.wfh ?? 2;

  const rows = data?.pendingApprovals ?? [];
  const openApprovals = rows.filter((r) => !decisions[r.id]);
  const outList = data?.outToday ?? [];
  const holidays = data?.upcomingHolidays ?? [];
  const week = data?.weekSummary ?? [];

  return (
    <>
      <PageHeader
        title={`Dashboard · ${data?.company.name || "Company Overview"}`}
        desc="Live team overview, attendance status, and pending approvals."
        actions={
          <>
            <Link href={`/${role}/employees`}>
              <Btn variant="outline" icon={Users}>
                Employees
              </Btn>
            </Link>
            <Link href={`/${role}/payroll`}>
              <Btn>Run payroll</Btn>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total employees" value={active} icon={Users} hint="Active team headcount" />
        <StatCard
          label="Present today"
          value={present}
          icon={UserCheck}
          tone="green"
          hint={`${active ? Math.round((present / active) * 100) : 0}% of the team`}
        />
        <StatCard label="On leave" value={onLeaveCount} icon={UserX} tone="indigo" hint="Approved leave today" />
        <StatCard label="Working from home" value={wfh} icon={House} tone="teal" hint="Approved WFH today" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pending approvals"
            desc="Leave and WFH requests requiring admin decision"
            action={<Badge tone="amber">{openApprovals.length} open</Badge>}
          />

          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading pending requests...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No pending approval requests. Your inbox is clear!
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.who} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{r.who}</p>
                        <Badge tone={r.kind === "WFH" ? "teal" : "blue"}>{r.kind}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.dates} {r.days ? `(${r.days} days)` : ""} · <em>{r.reason}</em>
                      </p>
                    </div>
                  </div>
                  {decisions[r.id] ? (
                    <StatusBadge s={decisions[r.id]} />
                  ) : (
                    <div className="flex gap-2">
                      <Btn
                        size="sm"
                        variant="outline"
                        icon={X}
                        disabled={actionLoading === r.id}
                        onClick={() => act(r, "Rejected")}
                      >
                        Reject
                      </Btn>
                      <Btn
                        size="sm"
                        variant="success"
                        icon={Check}
                        disabled={actionLoading === r.id}
                        onClick={() => act(r, "Approved")}
                      >
                        Approve
                      </Btn>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Out today" desc="On approved leave" />
          {outList.length === 0 ? (
            <div className="p-5 text-sm text-slate-400 italic">Everyone is working today.</div>
          ) : (
            <ul className="space-y-3 p-5">
              {outList.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.dept}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upcoming holidays</p>
            {holidays.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2">No upcoming holidays scheduled.</p>
            ) : (
              holidays.map((h) => (
                <p key={h.id} className="mt-2 flex justify-between text-sm text-slate-700">
                  <span>{h.name}</span>
                  <span className="text-slate-500 text-xs font-medium">{h.date}</span>
                </p>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Attendance this week"
            desc="Headcount by day"
            action={
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-emerald-500" />
                  Office
                </span>
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-teal-400" />
                  WFH
                </span>
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-indigo-400" />
                  Leave
                </span>
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-rose-400" />
                  Absent
                </span>
              </div>
            }
          />
          <div className="flex h-56 items-end gap-6 px-6 pb-5 pt-6">
            {week.map((w) => {
              const sum = Math.max(w.p + w.w + w.l + w.a, 1);
              return (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md bg-slate-100" style={{ height: "180px" }}>
                    <div style={{ height: `${(w.p / sum) * 100}%` }} className="bg-emerald-500" title={`Office: ${w.p}`} />
                    <div style={{ height: `${(w.w / sum) * 100}%` }} className="bg-teal-400" title={`WFH: ${w.w}`} />
                    <div style={{ height: `${(w.l / sum) * 100}%` }} className="bg-indigo-400" title={`Leave: ${w.l}`} />
                    <div style={{ height: `${(w.a / sum) * 100}%` }} className="bg-rose-400" title={`Absent: ${w.a}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{w.d}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
