"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileWarning, Loader2, LogIn, LogOut, Calendar, Wifi, WifiOff, House, AlertTriangle, XCircle } from "lucide-react";
import { PageHeader, Card, Stat, Btn, SectionLoader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
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
      wfhStatus?: "Approved" | "Pending" | "Rejected" | "None";
      wfhReason?: string | null;
      rejectionReason?: string | null;
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
  hoursSummary?: {
    todayHours: number;
    todayFormatted: string;
    weekHours: number;
    weekFormatted: string;
    monthHours: number;
    monthFormatted: string;
    avgDailyHours: number;
    presentCount: number;
  };
  schedule?: {
    startTime: string;
    endTime: string;
    lateCutoff: string;
    workingDays: string;
  };
  leaveBalance: {
    casual: { credited: number; used: number; left: number; formula?: string; carriedForward?: number };
    sick: { credited: number; used: number; left: number; formula?: string; carriedForward?: number };
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
  salaryStatus?: {
    month: string;
    cycleDate: number;
    isPaid: boolean;
    paidOn: string | null;
    pending: boolean;
    message: string;
  };
  recentRejections?: {
    kind: string;
    type: string;
    period: string;
    days?: number;
    reason: string;
    rejectionReason: string | null;
    decidedAt: string;
  }[];
}

export default function EmployeeHomePage() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [timeStr, setTimeStr] = useState("09:42");
  const [wfhModalOpen, setWfhModalOpen] = useState(false);
  const [wfhReason, setWfhReason] = useState("");
  const [submittingWfh, setSubmittingWfh] = useState(false);

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

  const handleQuickWfhRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWfh(true);
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "Work from home",
          from: todayStr,
          to: todayStr,
          why: wfhReason.trim() || "Work From Home for today",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit WFH request");

      toast.success("Work From Home request sent to HR. Awaiting approval.");
      setWfhModalOpen(false);
      setWfhReason("");
      await fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit WFH request");
    } finally {
      setSubmittingWfh(false);
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
      <SectionLoader message="Loading employee workspace..." size={48} className="py-24" />
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
    (leave?.casual.left || 0) + (leave?.sick.left || 0);

  const isNetworkAllowed = verif?.allowed ?? true;

  return (
    <>
      <PageHeader
        title={`Good day, ${user?.name?.split(" ")[0] || "Team Member"}`}
        sub={`${user?.title} · ${user?.companyName}`}
      />

      {/* Monthly Salary Status Banner (1st of month cycle) */}
      {data?.salaryStatus?.pending && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-base shadow-xs">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Monthly Salary Pending Disbursement</span>
                <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[11px] font-medium text-amber-800">Cycle: 1st of month</span>
              </div>
              <p className="mt-0.5 text-amber-800">
                Salary for <b>{data.salaryStatus.month}</b> is currently pending payment by HR/Admin. You will be able to request and view your salary slip once marked paid.
              </p>
            </div>
          </div>
          <Link
            href="/employee/payslips"
            className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-100/60 transition shadow-2xs"
          >
            View Payslips
          </Link>
        </div>
      )}

      {data?.salaryStatus && !data.salaryStatus.pending && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Salary for <b>{data.salaryStatus.month}</b> was disbursed on <b>{data.salaryStatus.paidOn || '1st of the month'}</b>.
            </span>
          </div>
          <Link
            href="/employee/payslips"
            className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Request / View Salary Slip →
          </Link>
        </div>
      )}

      {/* Rejected Request Alerts Banner */}
      {data?.recentRejections && data.recentRejections.length > 0 && (
        <div className="mb-6 space-y-3">
          {data.recentRejections.map((rej, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900 shadow-xs flex flex-wrap items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <XCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-rose-950 text-sm">
                    {rej.type} Request Rejected by HR ({rej.period})
                  </p>
                  <p className="text-rose-800 mt-1">
                    <span className="font-medium text-rose-950">HR Rejection Reason: </span>
                    <span className="font-semibold">{rej.rejectionReason || "No specific feedback provided."}</span>
                  </p>
                  {rej.reason && (
                    <p className="text-rose-600 text-[11px] mt-0.5">
                      Your original note: &quot;{rej.reason}&quot;
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/employee/leave"
                className="rounded-lg bg-white border border-rose-200 px-3 py-1.5 font-medium text-rose-800 hover:bg-rose-100/60 transition shadow-2xs"
              >
                View Requests
              </Link>
            </div>
          ))}
        </div>
      )}

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
              ) : verif?.wfhStatus === "Approved" ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-emerald-800 font-medium">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <House className="h-4 w-4 text-emerald-600" />
                    <span>
                      Work From Home <b>Approved by HR</b> for today ({today?.clientIp})
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Network restriction lifted. You are authorized to check in from home.
                  </p>
                </div>
              ) : verif?.wfhStatus === "Pending" ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-800 font-medium">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>
                      WFH request is <b>Pending HR Approval</b> ({today?.clientIp})
                    </span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Your request to work from home today has been submitted to HR. Check-in will unlock once HR approves.
                  </p>
                </div>
              ) : verif?.wfhStatus === "Rejected" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-rose-800 font-medium">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>
                      WFH request was <b>Rejected by HR</b>
                    </span>
                  </div>
                  {verif?.rejectionReason && (
                    <div className="rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs text-rose-900">
                      <span className="font-semibold text-rose-950">Rejection Reason: </span>
                      <span>{verif.rejectionReason}</span>
                    </div>
                  )}
                  <p className="text-xs text-rose-700">
                    Check-in is only permitted when connected to an authorized office WiFi network.
                  </p>
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
                    Attendance is locked to company WiFi. If you are working from home today, submit a WFH request for HR approval.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
            {!today?.checkedIn ? (
              <div className="flex flex-wrap items-center gap-2">
                {verif?.wfhStatus !== "Approved" && verif?.wfhStatus !== "Pending" && !isNetworkAllowed && (
                  <button
                    type="button"
                    onClick={() => setWfhModalOpen(true)}
                    className="btn-ghost px-4 py-2.5 text-sm border-pine text-pine hover:bg-pine-soft flex items-center gap-1.5 font-medium rounded-lg"
                  >
                    <House className="h-4 w-4" />
                    Request WFH for Today
                  </button>
                )}

                <button
                  disabled={clocking || !isNetworkAllowed}
                  onClick={() => handleAttendance("check_in")}
                  className={`btn px-7 py-3 text-base flex items-center justify-center gap-2 ${
                    !isNetworkAllowed
                      ? verif?.wfhStatus === "Pending"
                        ? "opacity-75 cursor-not-allowed bg-amber-600 border-amber-600 text-white"
                        : "opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-600"
                      : ""
                  }`}
                  title={
                    verif?.wfhStatus === "Pending"
                      ? "Awaiting HR WFH approval"
                      : !isNetworkAllowed
                      ? "Connect to office WiFi or get WFH approved by HR"
                      : "Click to check in"
                  }
                >
                  {clocking ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : verif?.wfhStatus === "Pending" ? (
                    <Clock className="h-5 w-5 animate-pulse" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  {verif?.wfhStatus === "Pending"
                    ? "Awaiting HR Approval"
                    : verif?.wfhStatus === "Approved"
                    ? "Check in (WFH)"
                    : "Check in"}
                </button>
              </div>
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
              Need leave or WFH for other dates?{" "}
              <Link href="/employee/leave" className="text-pine underline font-medium">
                Manage leave & WFH
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

      {/* Work Hours & Late Mark Policy */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="h-4 w-4 text-pine" />
          <span className="font-semibold text-slate-900">Office Working Hours:</span>
          <span>{data?.schedule?.startTime || "09:00"} – {data?.schedule?.endTime || "18:00"} (Mon–Fri)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            Late Cutoff: {data?.schedule?.lateCutoff || "09:15"} AM
          </span>
          <span className="text-slate-500">
            Check-in after {data?.schedule?.lateCutoff || "09:15"} AM is recorded as a <b>Late Mark</b>.
          </span>
        </div>
      </div>

      {/* Calculated Hours Worked Metrics */}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Stat
          label="Today's work time"
          value={data?.hoursSummary?.todayFormatted || "0h 00m"}
          note={today?.checkedIn && !today?.checkedOut ? "Clock running" : "Today's hours"}
        />
        <Stat
          label="This week's hours"
          value={data?.hoursSummary?.weekFormatted || "0h 00m"}
          note="Standard 40h target"
        />
        <Stat
          label="This month's hours"
          value={data?.hoursSummary?.monthFormatted || "0h 00m"}
          note={`${summary?.presentCount ?? 0} days recorded`}
        />
        <Stat
          label="Late arrivals"
          value={`${summary?.lateCount ?? 0}`}
          note={summary?.lateCount ? "Logged after cutoff" : "Zero late marks"}
        />
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Leave quota (CL + SL with carry forward)"
          value={`${totalLeaveLeft} days`}
          note={`Casual ${leave?.casual.left ?? 0} (${leave?.casual.formula || "1.5/mo"}) · Sick ${leave?.sick.left ?? 0} (${leave?.sick.formula || "1.0/mo"})`}
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

      {/* Quick Request WFH Modal */}
      <Modal
        open={wfhModalOpen}
        onClose={() => setWfhModalOpen(false)}
        title="Request Work From Home (Today)"
        desc="Submit your request to HR. Once HR approves, your check-in will be unlocked."
        footer={
          <>
            <Btn variant="outline" onClick={() => setWfhModalOpen(false)}>
              Cancel
            </Btn>
            <Btn
              type="submit"
              form="quick-wfh-form"
              disabled={submittingWfh}
              icon={submittingWfh ? Loader2 : House}
            >
              {submittingWfh ? "Submitting..." : "Send Request to HR"}
            </Btn>
          </>
        }
      >
        <form id="quick-wfh-form" onSubmit={handleQuickWfhRequest} className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-center justify-between">
            <span>Date: <b>Today ({new Date().toISOString().split("T")[0]})</b></span>
            <span>Your Network IP: <b>{today?.clientIp || "Detected"}</b></span>
          </div>

          <Field label="Reason for working from home" hint="HR will review this reason to approve your request.">
            <textarea
              className={`${inputCls} min-h-[90px] resize-none`}
              required
              placeholder="e.g. Health issue, urgent domestic commitment, or remote assignment"
              value={wfhReason}
              onChange={(e) => setWfhReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
