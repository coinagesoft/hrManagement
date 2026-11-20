"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileWarning, Loader2, LogIn, LogOut, Calendar, Wifi, WifiOff, House, AlertTriangle } from "lucide-react";
import { PageHeader, Card, Stat } from "@/components/ui";
import { useToast } from "@/components/interactive";
import { fmtINR } from "@/lib/dates";

interface DashboardData {
  user: {
    id: number;
    code: string;
    name: string;
    email: string;
    dept: string;
    title: string;
    companyName: string;
  };
  today: {
    date: string;
    checkedIn: boolean;
    checkInTime: string | null;
    checkedOut: boolean;
    checkOutTime: string | null;
    mode: string;
    status: string;
    clientIp: string;
    officeIp: string;
    verification?: {
      allowed: boolean;
      mode: "Office" | "WFH" | "Blocked";
      isEnforced: boolean;
      isWfhApproved: boolean;
      clientIp: string;
      reason: string;
      label: string;
      matchedNetwork?: string | null;
    };
  };
  monthSummary: {
    presentCount: number;
    totalRecorded: number;
    lateCount: number;
    leaveCount: number;
  };
  leaveBalance: {
    casual: { credited: number; used: number; left: number };
    sick: { credited: number; used: number; left: number };
    paid: { credited: number; used: number; left: number };
  };
  latestPayslip: {
    month: string;
    net: number;
    paidOn: string;
  } | null;
  pendingDocsCount: number;
  upcomingHolidays: {
    id: number;
    name: string;
    date: string;
    kind: string;
  }[];
}

export default function EmployeeHomePage() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [timeStr, setTimeStr] = useState("09:42");

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/employee/dashboard");
      const json = await res.json();
      if (json?.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load employee dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAttendance = async (action: "check_in" | "check_out") => {
    setClocking(true);
    try {
      const res = await fetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Attendance action failed");

      toast(json.message || "Attendance recorded");
      await fetchDashboard();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setClocking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pine" />
      </div>
    );
  }

  const user = data?.user;
  const today = data?.today;
  const summary = data?.monthSummary;
  const leave = data?.leaveBalance;
  const payslip = data?.latestPayslip;
  const holidays = data?.upcomingHolidays || [];
  const pendingDocs = data?.pendingDocsCount || 0;
  const verif = today?.verification;

  const totalLeaveLeft =
    (leave?.casual.left || 0) + (leave?.sick.left || 0) + (leave?.paid.left || 0);

  const isNetworkAllowed = verif?.allowed ?? true;

  return (
    <>
      <PageHeader
        title={`Good day, ${user?.name?.split(" ")[0] || "Team Member"}`}
        sub={`${user?.title} · ${user?.companyName}`}
      />

      {/* Clock-in Punch & Network Status Section */}
      <section className="rounded-xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="num text-6xl font-semibold tracking-tight text-slate-900">{timeStr}</p>

            {/* Dynamic Network Status Indicator */}
            <div className="mt-3.5">
              {verif?.mode === "Office" ? (
                <div className="flex items-center gap-2 text-sm text-emerald-800 font-medium">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Wifi className="h-4 w-4 text-emerald-600" />
                  <span>
                    Office network verified: <b>{verif.label}</b> ({today?.clientIp})
                  </span>
                </div>
              ) : verif?.mode === "WFH" ? (
                <div className="flex items-center gap-2 text-sm text-teal-800 font-medium">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <House className="h-4 w-4 text-teal-600" />
                  <span>
                    Approved Work From Home today ({today?.clientIp}) · Network restriction bypassed
                  </span>
                </div>
              ) : verif?.isEnforced === false ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Network verification policy disabled ({today?.clientIp})</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-rose-700 font-medium">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <WifiOff className="h-4 w-4 text-rose-600" />
                    <span>
                      Not on Office WiFi ({today?.clientIp})
                    </span>
                  </div>
                  <p className="text-xs text-rose-600">
                    Attendance is locked to company WiFi. Please connect to office network or request WFH.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {!today?.checkedIn ? (
              <button
                disabled={clocking || !isNetworkAllowed}
                onClick={() => handleAttendance("check_in")}
                className={`btn px-8 py-3 text-base flex items-center justify-center gap-2 ${
                  !isNetworkAllowed ? "opacity-50 cursor-not-allowed bg-slate-300 border-slate-300" : ""
                }`}
              >
                {clocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                Check in
              </button>
            ) : !today?.checkedOut ? (
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-mute flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Checked in at {today.checkInTime} ({today.mode})
                </span>
                <button
                  disabled={clocking}
                  onClick={() => handleAttendance("check_out")}
                  className="btn-ghost px-8 py-3 text-base border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center gap-2"
                >
                  {clocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                  Check out
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-6 py-3 text-emerald-800 text-sm font-medium">
                Completed today ({today.checkInTime} – {today.checkOutTime})
              </div>
            )}
            <p className="text-sm text-mute">
              Not at the office?{" "}
              <Link href="/employee/leave" className="text-pine underline font-medium">
                Request WFH
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Document Nudge Banner */}
      {pendingDocs > 0 && (
        <div className="mt-6">
          <Link
            href="/employee/documents"
            className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm text-amber-900 transition hover:bg-amber-100/80"
          >
            <div className="flex items-center gap-2.5">
              <FileWarning className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                HR asked for <b>{pendingDocs} document{pendingDocs > 1 ? "s" : ""}</b> from you.
              </span>
            </div>
            <span className="font-semibold underline">Upload now</span>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Leave left this year"
          value={`${totalLeaveLeft} days`}
          note={`Casual ${leave?.casual.left ?? 0} · Sick ${leave?.sick.left ?? 0} · Paid ${leave?.paid.left ?? 0}`}
        />
        <Stat
          label="Present in November"
          value={`${summary?.presentCount ?? 0} days`}
          note={summary?.lateCount ? `${summary.lateCount} late mark` : "On-time arrival"}
        />
        <Stat
          label={payslip ? `${payslip.month} payslip` : "Latest payslip"}
          value={payslip ? fmtINR(payslip.net) : "₹60,400"}
          note={payslip ? `Paid on ${payslip.paidOn}` : "Processed monthly"}
        />
      </div>

      {/* Upcoming Holidays */}
      <Card title="Upcoming company holidays" className="mt-6">
        <ul className="divide-y divide-line text-sm">
          {holidays.length === 0 ? (
            <li className="py-3 text-mute">No upcoming holidays scheduled.</li>
          ) : (
            holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">{h.name}</span>
                <span className="text-mute">{h.date}</span>
              </li>
            ))
          )}
        </ul>
      </Card>
    </>
  );
}
