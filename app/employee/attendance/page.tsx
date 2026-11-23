"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LogIn, LogOut, CheckCircle2, Wifi, WifiOff, House, Clock, XCircle } from "lucide-react";
import { PageHeader, Card, Stat, Table, Badge, Td, Th, Btn } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string;
  checkOut: string;
  mode: string;
  status: string;
  hoursDecimal?: number;
  hoursFormatted?: string;
  isActive?: boolean;
}

export default function AttendancePage() {
  const toast = useToast();
  const [month, setMonth] = useState("November 2026");
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [clientIp, setClientIp] = useState("127.0.0.1");
  const [verification, setVerification] = useState<any>(null);
  const [hours, setHours] = useState<{
    todayHours: number;
    todayFormatted: string;
    weekHours: number;
    weekFormatted: string;
    monthHours: number;
    monthFormatted: string;
    avgDailyHours: number;
    presentCount: number;
  } | null>(null);
  const [schedule, setSchedule] = useState<{
    startTime: string;
    endTime: string;
    lateCutoff: string;
    workingDays: string;
  } | null>(null);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    halfDays: 0,
    onLeave: 0,
  });
  const [todayStr, setTodayStr] = useState("2026-11-20");
  const [wfhModalOpen, setWfhModalOpen] = useState(false);
  const [wfhReason, setWfhReason] = useState("");
  const [submittingWfh, setSubmittingWfh] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/attendance?month=${encodeURIComponent(month)}`);
      const json = await res.json();
      if (json?.success) {
        setRecords(json.records);
        setSummary(json.summary);
        if (json.hours) setHours(json.hours);
        if (json.schedule) setSchedule(json.schedule);
        if (json.clientIp) setClientIp(json.clientIp);
        if (json.verification) setVerification(json.verification);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickWfh = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWfh(true);
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
      await fetchAttendance();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit WFH request");
    } finally {
      setSubmittingWfh(false);
    }
  };

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    fetchAttendance();
  }, [month]);

  const handlePunch = async (action: "check_in" | "check_out") => {
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
      await fetchAttendance();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setClocking(false);
    }
  };

  const todayRecord = records.find((r) => r.date === todayStr);
  const isCheckedIn = Boolean(todayRecord && todayRecord.checkIn !== "—");
  const isCheckedOut = Boolean(todayRecord && todayRecord.checkOut !== "—");
  const isAllowed = verification?.allowed ?? true;

  return (
    <>
      <PageHeader
        title="My attendance"
        sub={`Daily punch in/out timestamps, mode of work, and records for ${month}.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="field max-w-[180px]"
            aria-label="Select month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="November 2026">November 2026</option>
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
          </select>
        </div>
      </PageHeader>

      {/* Network Verification & Quick Punch Card */}
      <section className="mb-6 rounded-xl border border-line bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-mute block">
            Attendance Network Status
          </span>
          {verification?.mode === "Office" ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-emerald-800 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="h-4 w-4 text-emerald-600" />
              <span>Office WiFi Verified: <b>{verification.label}</b> ({clientIp})</span>
            </div>
          ) : verification?.wfhStatus === "Approved" ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-emerald-800 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <House className="h-4 w-4 text-emerald-600" />
              <span>Work From Home <b>Approved by HR</b> for today ({clientIp}) · Check-in unlocked</span>
            </div>
          ) : verification?.wfhStatus === "Pending" ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-amber-800 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <Clock className="h-4 w-4 text-amber-600" />
              <span>WFH request is <b>Pending HR Approval</b> ({clientIp})</span>
            </div>
          ) : verification?.wfhStatus === "Rejected" ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2 text-sm text-rose-800 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <XCircle className="h-4 w-4 text-rose-600" />
                <span>WFH request was <b>Rejected by HR</b> · Office WiFi required</span>
              </div>
              {verification?.rejectionReason && (
                <div className="rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs text-rose-900">
                  <span className="font-semibold text-rose-950">Reason: </span>
                  <span>{verification.rejectionReason}</span>
                </div>
              )}
            </div>
          ) : verification?.isEnforced === false ? (
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>Network restriction disabled by company policy ({clientIp})</span>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 text-sm text-rose-700 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <WifiOff className="h-4 w-4 text-rose-600" />
              <span>Not on office WiFi ({clientIp}). Submit a WFH request to check in.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCheckedIn ? (
            <>
              {verification?.wfhStatus !== "Approved" && verification?.wfhStatus !== "Pending" && !isAllowed && (
                <Btn
                  variant="outline"
                  icon={House}
                  onClick={() => setWfhModalOpen(true)}
                  className="text-pine border-pine hover:bg-pine-soft"
                >
                  Request WFH for Today
                </Btn>
              )}
              <Btn
                disabled={clocking || !isAllowed}
                icon={
                  clocking
                    ? Loader2
                    : verification?.wfhStatus === "Pending"
                    ? Clock
                    : LogIn
                }
                onClick={() => handlePunch("check_in")}
                className={
                  !isAllowed
                    ? verification?.wfhStatus === "Pending"
                      ? "opacity-75 cursor-not-allowed bg-amber-600 border-amber-600 text-white"
                      : "opacity-50 cursor-not-allowed"
                    : ""
                }
              >
                {verification?.wfhStatus === "Pending"
                  ? "Awaiting HR Approval"
                  : verification?.wfhStatus === "Approved"
                  ? "Check in (WFH)"
                  : "Check in today"}
              </Btn>
            </>
          ) : !isCheckedOut ? (
            <Btn
              variant="outline"
              disabled={clocking}
              icon={clocking ? Loader2 : LogOut}
              onClick={() => handlePunch("check_out")}
            >
              Check out ({todayRecord?.checkIn})
            </Btn>
          ) : (
            <Badge tone="green" dot>
              Completed ({todayRecord?.checkIn} – {todayRecord?.checkOut})
            </Badge>
          )}
        </div>
      </section>

      {/* Shift & Late Mark Rule Bar */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-600" />
          <span className="font-semibold text-slate-900">Office Schedule:</span>
          <span>{schedule?.startTime || "09:00"} – {schedule?.endTime || "18:00"} (Mon–Fri)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            Late Cutoff: {schedule?.lateCutoff || "09:15"} AM
          </span>
          <span className="text-slate-600">
            Check-ins after {schedule?.lateCutoff || "09:15"} AM are automatically marked <b>Late</b>.
          </span>
        </div>
      </div>

      {/* Calculated Hours Worked Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Today's hours"
          value={hours?.todayFormatted || "0h 00m"}
          note={isCheckedIn && !isCheckedOut ? "Clock running active" : "Today's work time"}
        />
        <Stat
          label="This week's hours"
          value={hours?.weekFormatted || "0h 00m"}
          note="Standard 40h target"
        />
        <Stat
          label="This month's hours"
          value={hours?.monthFormatted || "0h 00m"}
          note={`${summary.present} days logged`}
        />
        <Stat
          label="Late marks"
          value={`${summary.late}`}
          note={summary.late > 0 ? `After ${schedule?.lateCutoff || "09:15"}` : "No late marks"}
        />
      </div>

      <Card flush>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Check in</Th>
                <Th>Check out</Th>
                <Th>Hours</Th>
                <Th>Where</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="py-8 text-center text-mute">
                    No attendance records found for {month}.
                  </Td>
                </tr>
              ) : (
                records.map((a) => (
                  <tr key={a.id}>
                    <Td className="font-medium text-slate-900">{a.date}</Td>
                    <Td className="num">{a.checkIn}</Td>
                    <Td className="num text-mute">{a.checkOut}</Td>
                    <Td className="font-mono text-xs font-semibold text-slate-800">
                      {a.hoursFormatted || "—"}
                    </Td>
                    <Td>
                      {a.mode === "—" ? (
                        <span className="text-mute">—</span>
                      ) : (
                        <Badge tone={a.mode === "WFH" ? "blue" : "slate"}>{a.mode}</Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          a.status === "Present"
                            ? "green"
                            : a.status === "Late"
                            ? "amber"
                            : a.status === "On leave"
                            ? "slate"
                            : "rose"
                        }
                      >
                        {a.status}
                      </Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Quick Request WFH Modal */}
      <Modal
        open={wfhModalOpen}
        onClose={() => setWfhModalOpen(false)}
        title="Request Work From Home (Today)"
        desc="Submit your request to HR. Once HR approves, check-in will be unlocked."
        footer={
          <>
            <Btn variant="outline" onClick={() => setWfhModalOpen(false)}>
              Cancel
            </Btn>
            <Btn
              type="submit"
              form="quick-wfh-att-form"
              disabled={submittingWfh}
              icon={submittingWfh ? Loader2 : House}
            >
              {submittingWfh ? "Submitting..." : "Send Request to HR"}
            </Btn>
          </>
        }
      >
        <form id="quick-wfh-att-form" onSubmit={handleQuickWfh} className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-center justify-between">
            <span>Date: <b>Today ({todayStr})</b></span>
            <span>Your Network IP: <b>{clientIp}</b></span>
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
